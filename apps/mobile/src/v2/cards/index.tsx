import React from 'react';
import type { ChatMessage } from '../chatStore';
import { AlertCard, AnswerBody, ApprovalsCard, BriefCard, NoticeCard, TasksCard, TeamCard, ThemesCard } from './core';
import { FrictionCard, HandoverCard, ReportCard, VerifyCard } from './field';
import { ClaimCard, LeaveApplyCard, LeaveBalanceCard, LicenceCard, PayslipCard, RosterCard, SwapCard } from './hr';
import { RobotCommandCard, RobotsStatusCard, RobotTaskCard } from './robots';

/** Renders the interactive card for an assistant message. */
export function CardFor({ threadId, msg }: { threadId: string; msg: ChatMessage }) {
  const p = { threadId, msg };
  switch (msg.card) {
    case 'answer': return <AnswerBody msg={msg} />;
    case 'brief': return <BriefCard />;
    case 'tasks': return <TasksCard />;
    case 'report': return <ReportCard {...p} />;
    case 'verify': return <VerifyCard {...p} />;
    case 'handover': return <HandoverCard {...p} />;
    case 'friction': return <FrictionCard {...p} />;
    case 'leave_apply': return <LeaveApplyCard {...p} />;
    case 'leave_balance': return <LeaveBalanceCard />;
    case 'payslip': return <PayslipCard {...p} />;
    case 'claim': return <ClaimCard {...p} />;
    case 'swap': return <SwapCard {...p} />;
    case 'roster': return <RosterCard />;
    case 'licence': return <LicenceCard />;
    case 'robots_status': return <RobotsStatusCard />;
    case 'robot_command': return <RobotCommandCard {...p} />;
    case 'robot_task': return <RobotTaskCard {...p} />;
    case 'approvals': return <ApprovalsCard />;
    case 'team': return <TeamCard />;
    case 'alert': return <AlertCard />;
    case 'themes': return <ThemesCard />;
    case 'notice': return <NoticeCard {...p} />;
    default: return null;
  }
}
