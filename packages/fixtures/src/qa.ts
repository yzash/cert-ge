import type { Lang } from '@mozart/schema';

export interface QaPair {
  id: string;
  lang: Lang;
  q: string;
  /** keywords that must/should appear (lower case); scoring uses overlap */
  keys: string[];
  /** answer text; [n] markers refer to cites[n-1] */
  a: string;
  cites: { docId: string; sectionId: string }[];
  /** topic used for follow-up context */
  topic?: string;
}

/** 40 scripted grounded Q&A pairs for DEMO mode. Citations point at real fixture sections. */
export const qaPairs: QaPair[] = [
  {
    id: 'qa-01', lang: 'en', topic: 'supervisory', q: 'What is the SOP if the fire panel shows a supervisory fault on L3?',
    keys: ['supervisory', 'fault', 'panel', 'l3', 'fire'],
    a: 'A supervisory fault is not a fire alarm: a monitored sprinkler device is off-normal [1]. Tonight it is most likely the planned sprinkler works on L3 South, 23:00–04:00, which isolate the zone Z14 control valve [2].\n\n1. Note the zone on the panel LCD and inform FCC on channel 1. Do not silence or reset the panel [1].\n2. Confirm the contractor’s permit PTW-26-1182 at the valve [2].\n3. If there is no permit, check the control valve is fully open and escalate to the FCC duty officer, with a fire watch in L3 South [3].\n4. Photograph the panel and valve and attach them to the work order [4].',
    cites: [
      { docId: 'SOP-FIRE-007', sectionId: 's1' },
      { docId: 'NOTICE-TODAY', sectionId: 'sprinkler' },
      { docId: 'SOP-FIRE-007', sectionId: 's5' },
      { docId: 'SOP-FIRE-007', sectionId: 's4' },
    ],
  },
  {
    id: 'qa-02', lang: 'en', topic: 'supervisory', q: 'Can I reset the L3 sub-panel myself?',
    keys: ['reset', 'panel', 'sub-panel', 'myself'],
    a: 'No. Resetting requires an access level 2 key held by FCC; field officers must not reset sub-panels [1]. Report the zone to FCC and let them reset once the device is back to normal [2].',
    cites: [{ docId: 'MAN-FP2000', sectionId: 'reset' }, { docId: 'SOP-FIRE-007', sectionId: 's1' }],
  },
  {
    id: 'qa-03', lang: 'en', topic: 'supervisory', q: 'What do the LEDs on the fire panel mean?',
    keys: ['led', 'leds', 'lights', 'indicator', 'panel', 'mean'],
    a: 'POWER green means mains present; FIRE red is an active alarm zone; FAULT yellow is a wiring, battery or earth fault; SUPERVISORY amber means a monitored sprinkler valve, flow switch or pump is off-normal [1]. Normal state is power green with all others off [2].',
    cites: [{ docId: 'MAN-FP2000', sectionId: 'leds' }, { docId: 'SOP-FIRE-007', sectionId: 'expected' }],
  },
  {
    id: 'qa-04', lang: 'en', topic: 'gate', q: 'Loading bay gate 4 is stuck half open, what do I do?',
    keys: ['gate', 'stuck', 'jammed', 'loading', 'bay', 'shutter', 'open'],
    a: 'Cone off the gate and stop vehicle movement [1]. Check the safety edge and photo-eye for obstructions [2], then press RESET once only; repeated cycling can burn out the motor [3]. If it still does not respond, the SOP says to release it with the manual override key from the FCC key press [4]; the key is on hook K-07 and is signed out by the FCC duty officer [5].',
    cites: [
      { docId: 'SOP-GATE-004', sectionId: 's1' },
      { docId: 'SOP-GATE-004', sectionId: 's2' },
      { docId: 'MAN-RS500', sectionId: 'reset' },
      { docId: 'SOP-GATE-004', sectionId: 's4' },
      { docId: 'RULE-CNP', sectionId: 'keys' },
    ],
  },
  {
    id: 'qa-05', lang: 'en', topic: 'gate', q: 'What does a flashing amber fault lamp on the roller shutter mean?',
    keys: ['flashing', 'amber', 'lamp', 'shutter', 'gate', 'fault'],
    a: 'Flashing amber is a limit switch fault: the gate stops part-way [1]. Last week gate 4 had the same symptom and the contractor found a worn limit switch [2].',
    cites: [{ docId: 'MAN-RS500', sectionId: 'faults' }, { docId: 'INC-SUM-W39', sectionId: 'gate' }],
  },
  {
    id: 'qa-06', lang: 'en', topic: 'gate', q: 'Where is the override key for the loading bay gates?',
    keys: ['override', 'key', 'where', 'gate', 'loading'],
    a: 'In the FCC key press on L1, hook K-07, signed out by the FCC duty officer [1]. Officers on patrol do not carry override keys unless signed out for a specific job [2].',
    cites: [{ docId: 'RULE-CNP', sectionId: 'keys' }, { docId: 'SOP-ACC-005', sectionId: 's3' }],
  },
  {
    id: 'qa-07', lang: 'en', topic: 'gate', q: 'How do I wind the shutter closed by hand?',
    keys: ['wind', 'hand', 'manual', 'shutter', 'chain'],
    a: 'Insert the override key in the drive unit release, turn 90° clockwise, then wind with the hand chain. Never run the motor while the release is engaged [1].',
    cites: [{ docId: 'MAN-RS500', sectionId: 'manual' }],
  },
  {
    id: 'qa-08', lang: 'en', topic: 'fire', q: 'What do I do when a fire alarm goes off in my zone?',
    keys: ['fire', 'alarm', 'goes', 'activation', 'activated', 'zone'],
    a: 'Acknowledge it and tell FCC your location on channel 1 [1]. Go to the zone without using lifts [2]. If fire or smoke is confirmed, activate the nearest manual call point [3]. If false, report the device and cause; only FCC resets the main panel [4].',
    cites: [
      { docId: 'SOP-FIRE-001', sectionId: 's1' }, { docId: 'SOP-FIRE-001', sectionId: 's2' },
      { docId: 'SOP-FIRE-001', sectionId: 's3' }, { docId: 'SOP-FIRE-001', sectionId: 's4' },
    ],
  },
  {
    id: 'qa-09', lang: 'en', topic: 'door', q: 'A fire door is wedged open by a tenant, what should I do?',
    keys: ['fire', 'door', 'wedged', 'open', 'tenant'],
    a: 'Remove the wedge and check the door self-closes and latches [1]. Record the tenant’s unit and inform them on the spot [2]. Three offences in 30 days go to the property manager through your supervisor [3]. FD-L2-12 has already been wedged three times by unit #02-31 [4].',
    cites: [
      { docId: 'SOP-FIRE-012', sectionId: 's1' }, { docId: 'SOP-FIRE-012', sectionId: 's2' },
      { docId: 'SOP-FIRE-012', sectionId: 's4' }, { docId: 'INC-SUM-W39', sectionId: 'door' },
    ],
  },
  {
    id: 'qa-10', lang: 'en', topic: 'pump', q: 'What is the normal sprinkler pump pressure?',
    keys: ['pressure', 'pump', 'sprinkler', 'normal', 'bar', 'gauge'],
    a: 'Normal standing pressure is 6.0 to 8.0 bar with the controller in AUTO [1]. Below 6.0 bar inform FCC and the IFM duty technician within 15 minutes; below 4.0 bar escalate immediately as impaired protection [2].',
    cites: [{ docId: 'MAN-PUMP', sectionId: 'gauge' }, { docId: 'SOP-FIRE-015', sectionId: 's3' }],
  },
  {
    id: 'qa-11', lang: 'en', topic: 'medical', q: 'Someone collapsed near the atrium, what do I do?',
    keys: ['collapsed', 'collapse', 'medical', 'unconscious', 'injured', 'cpr'],
    a: 'Check for danger, call 995 and inform FCC with the exact location [1]. If they are not breathing normally, start CPR and send someone for the AED; the nearest is the L1 Atrium cabinet [2][3]. Assign an officer to meet the ambulance [4].',
    cites: [
      { docId: 'SOP-MED-003', sectionId: 's1' }, { docId: 'SOP-MED-003', sectionId: 's2' },
      { docId: 'MAN-AED', sectionId: 'daily' }, { docId: 'SOP-MED-003', sectionId: 's4' },
    ],
  },
  {
    id: 'qa-12', lang: 'en', topic: 'lift', q: 'Someone is trapped in a lift',
    keys: ['trapped', 'lift', 'elevator', 'stuck'],
    a: 'Talk to the passengers through the intercom and ask about medical conditions [1]. FCC calls the lift contractor (30-minute target) [2]. Never attempt a rescue yourself unless trained and authorised [3].',
    cites: [{ docId: 'SOP-LIFT-002', sectionId: 's1' }, { docId: 'SOP-LIFT-002', sectionId: 's2' }, { docId: 'SOP-LIFT-002', sectionId: 's3' }],
  },
  {
    id: 'qa-13', lang: 'en', topic: 'bag', q: 'There is an unattended bag at the atrium',
    keys: ['unattended', 'bag', 'suspicious', 'item', 'package'],
    a: 'Do not touch it. Assess it using HOT: Hidden, Obviously suspicious, Typical [1]. Ask people nearby and get FCC to check CCTV [2]. If suspicious, cordon 50 m, no radio within 15 m, and call FCC by phone [3].',
    cites: [{ docId: 'SOP-SEC-010', sectionId: 's1' }, { docId: 'SOP-SEC-010', sectionId: 's2' }, { docId: 'SOP-SEC-010', sectionId: 's3' }],
  },
  {
    id: 'qa-14', lang: 'en', topic: 'child', q: 'A parent says their child is missing',
    keys: ['child', 'missing', 'lost', 'kid', 'parent'],
    a: 'Get the description and last-seen location and inform FCC immediately [1]. FCC calls Code Amber and officers at exits watch for the child [2]. A found child is escorted to Customer Service L1 by two staff, never one [3].',
    cites: [{ docId: 'SOP-SEC-014', sectionId: 's1' }, { docId: 'SOP-SEC-014', sectionId: 's2' }, { docId: 'SOP-SEC-014', sectionId: 's3' }],
  },
  {
    id: 'qa-15', lang: 'en', topic: 'theft', q: 'A shop reported a theft, can I stop the suspect?',
    keys: ['theft', 'shoplifting', 'stolen', 'suspect', 'detain', 'stop'],
    a: 'Do not detain. Take the tenant’s report, ask FCC to preserve CCTV, and advise the tenant to make a police report, recording the number [1][2].',
    cites: [{ docId: 'SOP-SEC-018', sectionId: 's3' }, { docId: 'SOP-SEC-018', sectionId: 's2' }],
  },
  {
    id: 'qa-16', lang: 'en', topic: 'contractor', q: 'Can a contractor enter at midnight without a permit?',
    keys: ['contractor', 'permit', 'midnight', 'after-hours', 'enter', 'access'],
    a: 'No. After 22:00 contractors enter only through B2 Loading Bay with a valid permit-to-work, checked against the FCC permit board [1][2]. Works in public areas are allowed only 23:00–06:00 with a permit [3].',
    cites: [{ docId: 'SOP-ACC-002', sectionId: 's1' }, { docId: 'SOP-ACC-002', sectionId: 's2' }, { docId: 'RULE-CNP', sectionId: 'contractors' }],
  },
  {
    id: 'qa-17', lang: 'en', topic: 'radio', q: 'Which radio channel is the loading bay?',
    keys: ['radio', 'channel', 'loading'],
    a: 'Channel 3 is loading bay and contractors. Channel 1 is FCC and emergencies, channel 2 patrol, channel 4 car park [1].',
    cites: [{ docId: 'RULE-CNP', sectionId: 'radio' }],
  },
  {
    id: 'qa-18', lang: 'en', topic: 'canopy', q: 'What time does Canopy Park close?',
    keys: ['canopy', 'park', 'close', 'closing', 'time'],
    a: 'L5 Canopy Park closes to the public at 22:00; the last patrol checks the hedge maze and the canopy bridge [1].',
    cites: [{ docId: 'RULE-CNP', sectionId: 'canopy' }],
  },
  {
    id: 'qa-19', lang: 'en', topic: 'weather', q: 'Lightning alert, what do we close?',
    keys: ['lightning', 'weather', 'storm', 'thunder'],
    a: 'Close the L5 Canopy Park attractions and the canopy bridge, guide visitors indoors and sign all L5 entrances [1][2]. Reopen only on FCC all-clear, usually 30 minutes after the last strike [3].',
    cites: [{ docId: 'SOP-WX-001', sectionId: 's1' }, { docId: 'SOP-WX-001', sectionId: 's2' }, { docId: 'SOP-WX-001', sectionId: 's3' }],
  },
  {
    id: 'qa-20', lang: 'en', topic: 'evac', q: 'What do I do in an evacuation?',
    keys: ['evacuation', 'evacuate', 'evac'],
    a: 'Go to your assigned sector, send the public to exit staircases (no lifts or escalators), sweep including toilets and nursing rooms, then report "Sector clear" to FCC and go to assembly area A [1][2][3][4].',
    cites: [
      { docId: 'SOP-EVAC-002', sectionId: 's1' }, { docId: 'SOP-EVAC-002', sectionId: 's2' },
      { docId: 'SOP-EVAC-002', sectionId: 's3' }, { docId: 'SOP-EVAC-002', sectionId: 's4' },
    ],
  },
  {
    id: 'qa-21', lang: 'en', topic: 'lockdown', q: 'What is the lockdown procedure?',
    keys: ['lockdown', 'shelter', 'lock'],
    a: 'Close and lock the shutters in your sector, move the public away from glass into tenant units or back-of-house corridors, keep radio to essentials, and do not open until FCC gives the code word [1][2][3][4].',
    cites: [
      { docId: 'SOP-LOCK-001', sectionId: 's1' }, { docId: 'SOP-LOCK-001', sectionId: 's2' },
      { docId: 'SOP-LOCK-001', sectionId: 's3' }, { docId: 'SOP-LOCK-001', sectionId: 's4' },
    ],
  },
  {
    id: 'qa-22', lang: 'en', topic: 'leak', q: 'Water is dripping from the ceiling in L3',
    keys: ['water', 'leak', 'dripping', 'ceiling', 'seepage'],
    a: 'Cordon the area and put down buckets or absorbent socks [1]. Check for electrical panels or lighting nearby; if water is near electrics, keep people 3 m away and get FCC to call the duty electrician [2][3]. Raise a corrective work order with photos [4].',
    cites: [
      { docId: 'SOP-HAZ-004', sectionId: 's1' }, { docId: 'SOP-HAZ-004', sectionId: 's2' },
      { docId: 'SOP-HAZ-007', sectionId: 's1' }, { docId: 'SOP-HAZ-004', sectionId: 's3' },
    ],
  },
  {
    id: 'qa-23', lang: 'en', topic: 'spill', q: 'Spill on the floor near the food court',
    keys: ['spill', 'wet', 'floor', 'slippery'],
    a: 'Put a wet-floor sign down straight away and stay until cleaners arrive; request cleaning through FCC, target 10 minutes [1][2].',
    cites: [{ docId: 'SOP-HAZ-001', sectionId: 's1' }, { docId: 'SOP-HAZ-001', sectionId: 's2' }],
  },
  {
    id: 'qa-24', lang: 'en', topic: 'escalator', q: 'When can I press the escalator emergency stop?',
    keys: ['escalator', 'emergency', 'stop', 'button'],
    a: 'Only if someone is caught or has fallen [1]. Then barricade both landings, inform FCC, and do not restart; only the contractor restarts it [2][3]. Note that E-L1-02 is under maintenance 01:00–03:00 tonight [4].',
    cites: [
      { docId: 'SOP-ESC-001', sectionId: 's1' }, { docId: 'SOP-ESC-001', sectionId: 's2' },
      { docId: 'SOP-ESC-001', sectionId: 's3' }, { docId: 'NOTICE-TODAY', sectionId: 'escalator' },
    ],
  },
  {
    id: 'qa-25', lang: 'en', topic: 'handover', q: 'What must be in my shift handover?',
    keys: ['handover', 'hand', 'over', 'shift', 'end'],
    a: 'Open work orders, incidents, alarms and anything unusual, signed by you and acknowledged by the incoming officer before they take the post [1][2][3]. The app drafts this for you from your shift’s records.',
    cites: [{ docId: 'SOP-OPS-001', sectionId: 's1' }, { docId: 'SOP-OPS-001', sectionId: 's2' }, { docId: 'SOP-OPS-001', sectionId: 's3' }],
  },
  {
    id: 'qa-26', lang: 'en', topic: 'closure', q: 'What evidence do I need to close a work order?',
    keys: ['evidence', 'close', 'closure', 'work', 'order'],
    a: 'At least one photo or verification, your signature, and supervisor approval [1][2]. Work orders closed without evidence are reopened automatically [3].',
    cites: [{ docId: 'SOP-OPS-004', sectionId: 's1' }, { docId: 'SOP-OPS-004', sectionId: 's2' }, { docId: 'SOP-OPS-004', sectionId: 's3' }],
  },
  {
    id: 'qa-27', lang: 'en', topic: 'checkpoint', q: 'What happens if I miss a checkpoint?',
    keys: ['miss', 'missed', 'checkpoint', 'tour'],
    a: 'After a 10-minute grace period your supervisor is alerted and will radio you; no answer in 2 minutes triggers a welfare check [1][2]. Record the reason when you can [3].',
    cites: [{ docId: 'SOP-PAT-003', sectionId: 's1' }, { docId: 'SOP-PAT-003', sectionId: 's2' }, { docId: 'SOP-PAT-003', sectionId: 's3' }],
  },
  {
    id: 'qa-28', lang: 'en', topic: 'bolo', q: 'How do I describe a suspicious person to FCC?',
    keys: ['describe', 'suspicious', 'person', 'bolo', 'description'],
    a: 'Observe, do not confront [1]. Give gender, age range, clothing top to bottom and direction of travel, and keep visual contact from a safe distance until FCC has them on CCTV [2][3].',
    cites: [{ docId: 'SOP-SEC-011', sectionId: 's1' }, { docId: 'SOP-SEC-011', sectionId: 's2' }, { docId: 'SOP-SEC-011', sectionId: 's3' }],
  },
  {
    id: 'qa-29', lang: 'en', topic: 'vehicle', q: 'A van is in the loading bay without a booking',
    keys: ['van', 'vehicle', 'truck', 'lorry', 'booking', 'unauthorised'],
    a: 'Record the plate and ask for the delivery booking. No booking: direct it to leave; if the driver refuses, inform FCC [1][2]. Loading bay delivery windows are 05:00–10:00 and 22:00–01:00 [3].',
    cites: [{ docId: 'SOP-VEH-002', sectionId: 's1' }, { docId: 'SOP-VEH-002', sectionId: 's2' }, { docId: 'RULE-CNP', sectionId: 'loading' }],
  },
  {
    id: 'qa-30', lang: 'en', topic: 'cctv', q: 'FCC says a camera is offline on the canopy bridge',
    keys: ['camera', 'cctv', 'offline'],
    a: 'Go to the camera and check for damage or obstruction, patrol its field of view every 30 minutes until restored, and raise a corrective work order with the camera ID [1][2][3].',
    cites: [{ docId: 'SOP-CCTV-001', sectionId: 's1' }, { docId: 'SOP-CCTV-001', sectionId: 's2' }, { docId: 'SOP-CCTV-001', sectionId: 's3' }],
  },
  {
    id: 'qa-31', lang: 'en', topic: 'barrier', q: 'The carpark barrier is stuck and cars are queuing',
    keys: ['barrier', 'carpark', 'car', 'park', 'queue', 'queuing'],
    a: 'Raise the barrier manually with the yellow lever and keep it up, tell FCC to set the carpark to free-flow, then raise a work order with the barrier ID [1][2][3].',
    cites: [{ docId: 'SOP-GATE-006', sectionId: 's1' }, { docId: 'SOP-GATE-006', sectionId: 's2' }, { docId: 'SOP-GATE-006', sectionId: 's3' }],
  },
  {
    id: 'qa-32', lang: 'en', topic: 'notice', q: 'Any notices for tonight?',
    keys: ['notices', 'tonight', 'notice', 'today', 'briefing'],
    a: 'Three: sprinkler works on L3 South 23:00–04:00 with an expected supervisory fault on zone Z14 [1]; a VIP arrival on the Terminal Link Bridge at 21:30 [2]; and escalator E-L1-02 barricaded 01:00–03:00 [3].',
    cites: [{ docId: 'NOTICE-TODAY', sectionId: 'sprinkler' }, { docId: 'NOTICE-TODAY', sectionId: 'vip' }, { docId: 'NOTICE-TODAY', sectionId: 'escalator' }],
  },
  {
    id: 'qa-33', lang: 'en', topic: 'break', q: 'When can I take my meal break?',
    keys: ['meal', 'break', 'eat', 'lunch', 'dinner'],
    a: 'Night shift meal breaks are staggered between 00:00 and 03:00; inform FCC before you go [1].',
    cites: [{ docId: 'RULE-CNP', sectionId: 'meal' }],
  },
  {
    id: 'qa-34', lang: 'en', topic: 'aggressive', q: 'A customer is shouting at a tenant and getting aggressive',
    keys: ['aggressive', 'shouting', 'angry', 'fight', 'agitated'],
    a: 'Keep a safe distance and an exit route and call for a second officer [1]. Use calm, open language [2]. If violence is threatened, step back and have FCC call police [3]. Switch your body-worn camera on [4].',
    cites: [
      { docId: 'SOP-SEC-020', sectionId: 's1' }, { docId: 'SOP-SEC-020', sectionId: 's2' },
      { docId: 'SOP-SEC-020', sectionId: 's3' }, { docId: 'RULE-CNP', sectionId: 'uniform' },
    ],
  },
  // ----- multilingual -----
  {
    id: 'qa-35', lang: 'ms', topic: 'gate', q: 'Pintu pagar loading bay tersangkut, apa saya perlu buat?',
    keys: ['pintu', 'pagar', 'tersangkut', 'rosak', 'loading'],
    a: 'Letakkan kon dan hentikan pergerakan kenderaan [1]. Periksa safety edge dan photo-eye [2]. Tekan RESET sekali sahaja [3]. Jika masih tidak berfungsi, SOP menyatakan gunakan kunci override dari key press FCC (cangkuk K-07) [4][5].',
    cites: [
      { docId: 'SOP-GATE-004', sectionId: 's1' }, { docId: 'SOP-GATE-004', sectionId: 's2' },
      { docId: 'SOP-GATE-004', sectionId: 's3' }, { docId: 'SOP-GATE-004', sectionId: 's4' }, { docId: 'RULE-CNP', sectionId: 'keys' },
    ],
  },
  {
    id: 'qa-36', lang: 'ms', topic: 'supervisory', q: 'Panel kebakaran tunjuk supervisory di L3, apa prosedurnya?',
    keys: ['panel', 'kebakaran', 'supervisory', 'prosedur'],
    a: 'Supervisory bukan penggera kebakaran [1]. Malam ini ada kerja sprinkler di L3 South 23:00–04:00 (zon Z14) [2]. Maklumkan FCC di saluran 1 dan jangan reset panel [1]. Sahkan permit PTW-26-1182 di injap [2].',
    cites: [{ docId: 'SOP-FIRE-007', sectionId: 's1' }, { docId: 'NOTICE-TODAY', sectionId: 'sprinkler' }],
  },
  {
    id: 'qa-37', lang: 'zh', topic: 'supervisory', q: '三楼火警面板显示监视故障怎么办？',
    keys: ['火警', '面板', '监视', '故障', '三楼'],
    a: '监视信号不是火警，而是被监控的喷淋装置不正常 [1]。今晚 23:00–04:00 L3 South 有喷淋工程，区域 Z14 [2]。请在1号频道通知消防控制中心，不要复位面板 [1]。如无工作许可证，检查控制阀并上报值班主任 [3]。',
    cites: [{ docId: 'SOP-FIRE-007', sectionId: 's1' }, { docId: 'NOTICE-TODAY', sectionId: 'sprinkler' }, { docId: 'SOP-FIRE-007', sectionId: 's5' }],
  },
  {
    id: 'qa-38', lang: 'zh', topic: 'child', q: '有小孩走失怎么办？',
    keys: ['小孩', '走失', '孩子', '儿童'],
    a: '立即记录小孩特征和最后出现地点，并通知消防控制中心 [1]。控制中心会启动 Code Amber [2]。找到的小孩必须由两名员工护送到 L1 客服柜台 [3]。',
    cites: [{ docId: 'SOP-SEC-014', sectionId: 's1' }, { docId: 'SOP-SEC-014', sectionId: 's2' }, { docId: 'SOP-SEC-014', sectionId: 's3' }],
  },
  {
    id: 'qa-39', lang: 'ta', topic: 'medical', q: 'ஒருவர் மயங்கி விழுந்துவிட்டார், என்ன செய்ய வேண்டும்?',
    keys: ['மயங்கி', 'விழுந்து', 'மருத்துவ'],
    a: 'ஆபத்தை சரிபார்த்து, 995 அழைத்து FCC-க்கு சரியான இடத்தை தெரிவிக்கவும் [1]. சுவாசம் சாதாரணமாக இல்லையென்றால் CPR தொடங்கி AED கொண்டு வர அனுப்பவும் [2].',
    cites: [{ docId: 'SOP-MED-003', sectionId: 's1' }, { docId: 'SOP-MED-003', sectionId: 's2' }],
  },
  {
    id: 'qa-40', lang: 'ta', topic: 'radio', q: 'லோடிங் பே ரேடியோ சேனல் எது?',
    keys: ['ரேடியோ', 'சேனல்', 'லோடிங்'],
    a: 'சேனல் 3 லோடிங் பே மற்றும் ஒப்பந்ததாரர்களுக்கு. சேனல் 1 FCC மற்றும் அவசரநிலைகள் [1].',
    cites: [{ docId: 'RULE-CNP', sectionId: 'radio' }],
  },
];

/** Suggested prompts shown on the Ask screen. */
export const suggestedQuestions = [
  'What is the SOP if the fire panel shows a supervisory fault on L3?',
  'Where is the override key for the loading bay gates?',
  'Any notices for tonight?',
  'Panel kebakaran tunjuk supervisory di L3, apa prosedurnya?',
];
