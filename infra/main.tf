# Mozart Frontline: minimal GCP footprint for the trial (Phase 4). Review with Certis platform team before apply.
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = ">= 6.0" }
  }
}

variable "project" { type = string }
variable "region" {
  type    = string
  default = "asia-southeast1" # officer PII, audio, images stay in Singapore
}
variable "bff_image" { type = string }
variable "idp_issuer_uri" { type = string }
variable "idp_client_id" { type = string }

provider "google" {
  project = var.project
  region  = var.region
}

# --- Identity: Workforce Identity Federation for officers (per-user tokens, never a shared SA)
resource "google_iam_workforce_pool" "officers" {
  workforce_pool_id = "certis-officers"
  parent            = "organizations/REPLACE_ORG_ID"
  location          = "global"
  display_name      = "Certis frontline officers"
}

resource "google_iam_workforce_pool_provider" "idp" {
  workforce_pool_id = google_iam_workforce_pool.officers.workforce_pool_id
  location          = "global"
  provider_id       = "certis-idp"
  attribute_mapping = { "google.subject" = "assertion.sub", "attribute.site" = "assertion.site" }
  oidc {
    issuer_uri = var.idp_issuer_uri
    client_id  = var.idp_client_id
    web_sso_config {
      response_type             = "CODE"
      assertion_claims_behavior = "MERGE_USER_INFO_OVER_ID_TOKEN_CLAIMS"
    }
  }
}

# --- Data plane
resource "google_firestore_database" "frontline" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

resource "google_storage_bucket" "media" {
  name                        = "${var.project}-frontline-media"
  location                    = var.region
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 730 }
    action { type = "Delete" }
  }
}

resource "google_bigquery_dataset" "frontline" {
  dataset_id = "frontline"
  location   = var.region
}

resource "google_bigquery_table" "audit" {
  dataset_id          = google_bigquery_dataset.frontline.dataset_id
  table_id            = "audit"
  deletion_protection = true
  time_partitioning {
    type          = "DAY"
    expiration_ms = 63072000000 # 2 years
  }
  schema = jsonencode([
    { name = "at", type = "TIMESTAMP" }, { name = "kind", type = "STRING" }, { name = "feature", type = "STRING" },
    { name = "officer_id", type = "STRING" }, { name = "model", type = "STRING" }, { name = "prompt_hash", type = "STRING" },
    { name = "latency_ms", type = "INT64" }, { name = "tokens", type = "INT64" }, { name = "record_id", type = "STRING" },
    { name = "confirmed_at", type = "TIMESTAMP" },
  ])
}

resource "google_pubsub_topic" "events" {
  name = "frontline-events"
}

# --- BFF on Cloud Run
resource "google_service_account" "bff" {
  account_id   = "frontline-bff"
  display_name = "Mozart Frontline BFF"
}

resource "google_cloud_run_v2_service" "bff" {
  name     = "frontline-bff"
  location = var.region
  template {
    service_account = google_service_account.bff.email
    containers {
      image = var.bff_image
      env {
        name  = "GCP_PROJECT"
        value = var.project
      }
      env {
        name  = "VERTEX_LOCATION"
        value = var.region
      }
      env {
        name  = "WIF_AUDIENCE"
        value = "//iam.googleapis.com/locations/global/workforcePools/${google_iam_workforce_pool.officers.workforce_pool_id}/providers/${google_iam_workforce_pool_provider.idp.provider_id}"
      }
    }
  }
}

output "bff_url" { value = google_cloud_run_v2_service.bff.uri }
