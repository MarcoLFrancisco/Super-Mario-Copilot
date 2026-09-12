const field = (id, label, options, answer, hint) => ({ id, label, options, answer, hint });
const table = (title, columns, rows) => ({ title, columns, rows });
const stage = (title, command, prompt, fields) => ({ title, command, prompt, fields });

const orders = [
  { region: 'North', units: 12, price: 50, discount: 0 },
  { region: 'South', units: 8, price: 50, discount: 40 },
  { region: 'West', units: 5, price: 80, discount: 0 }
];
const salesRows = orders.map(order => [order.region, String(order.units), String(order.price),
  String(order.discount), String(order.units * order.price - order.discount)]);
const salesTotal = orders.reduce((sum, order) => sum + order.units * order.price - order.discount, 0);

export const WORK_TASKS = {
  campus: [
    {
      key: 'brief', title: 'Write the launch brief', product: 'Copilot in Word', icon: 'file-text',
      goal: 'Deliver a short launch brief with the agreed date, owner, and unresolved risk.',
      context: 'Work IQ context: the latest project files and messages you are permitted to access.',
      sources: table('Launch context', ['Source', 'Evidence'], [
        ['Project plan v3', 'Launch target: 18 September. Owner: Maya.'],
        ['Teams decision', 'Legal review is still pending. Do not promise a launch date.'],
        ['Old plan v1', 'Launch target: 11 September. Superseded.']
      ]),
      request: stage('Ground the request', 'Draft with Copilot', 'Prepare a launch brief for the project team.', [
        field('context', 'Source context', [['latest','Latest plan and Teams decision'],['old','Old plan only'],['guess','No sources']], 'latest', 'The current plan and Teams decision contain the agreed target and its risk.')
      ]),
      draft: table('Copilot draft', ['Section', 'Draft'], [
        ['Launch', 'Confirmed for 18 September.'], ['Owner', 'Maya'], ['Risk', 'Legal review pending.']
      ]),
      review: stage('Review the claim', 'Save reviewed brief', 'The draft calls the target confirmed. The Teams decision does not.', [
        field('date', 'Launch wording', [['target','Target: 18 September, subject to legal approval'],['confirmed','Confirmed: 18 September']], 'target', 'Use the target wording. Pending legal approval means the date is not confirmed.')
      ]),
      result: table('Launch-brief.docx', ['Section', 'Saved result'], [
        ['Launch', 'Target: 18 September, subject to legal approval.'], ['Owner', 'Maya'], ['Sources', 'Project plan v3; Teams decision.']
      ])
    },
    {
      key: 'workbook', title: 'Create the sales workbook', product: 'Copilot in Excel + Work IQ', icon: 'table-2',
      goal: 'Create a regional sales workbook with net revenue and an accurate grand total.',
      context: 'Work IQ supplies the approved order context. Copilot in Excel builds the table and formulas.',
      sources: table('Approved orders / USD', ['Region','Units','Unit price','Discount','Net revenue'], salesRows),
      request: stage('Set the analysis', 'Create workbook draft', 'Create a workbook from approved orders. Calculate revenue after discounts.', [
        field('scope','Data scope',[['approved','Approved orders and discount policy'],['forecast','Unconfirmed pipeline estimates']],'approved','Only approved orders belong in this sales report.'),
        field('formula','Net revenue',[['net','Units * Unit price - Discount'],['gross','Units * Unit price']],'net','South has a $40 discount. Net revenue must subtract it.')
      ]),
      draft: table('Regional-sales.xlsx / AI draft', ['Region','Net revenue'], [
        ...salesRows.map(row => [row[0], row[4]]), ['Grand total', String(salesTotal + 40)]
      ]),
      review: stage('Check the total', 'Save corrected workbook', 'The row values are right, but the draft total still includes the $40 discount.', [
        field('total','Grand-total formula',[['sum','SUM of the three net-revenue cells: 1,360'],['gross','Use gross sales: 1,400']],'sum','600 + 360 + 400 = 1,360. Sum the net-revenue cells, not the gross-sales values.')
      ]),
      result: table('Regional-sales.xlsx', ['Region','Net revenue / USD'], [
        ...salesRows.map(row => [row[0], row[4]]), ['Grand total', String(salesTotal)]
      ])
    },
    {
      key: 'deck', title: 'Build the customer deck', product: 'Copilot in PowerPoint', icon: 'presentation',
      goal: 'Create a customer-ready deck without exposing internal-only notes.',
      context: 'Copilot can build a presentation from permitted source documents. Audience and review still matter.',
      sources: table('Presentation inputs', ['Document','Audience'], [
        ['Product overview','Approved for customers'], ['Launch timeline','Public target dates'], ['Internal price floor','Finance only']
      ]),
      request: stage('Choose the source pack','Create presentation','Prepare three slides for a customer meeting.',[
        field('sources','Source pack',[['public','Product overview and public timeline'],['all','All files, including the price floor']],'public','The internal price floor is outside the customer audience.')
      ]),
      draft: table('Customer deck / outline',['Slide','Draft claim'],[
        ['1','Product overview'],['2','Launch target: 18 September'],['3','Guaranteed 50% savings']
      ]),
      review: stage('Remove unsupported claims','Save customer deck','No source supports the savings guarantee.',[
        field('claim','Final slide',[['evidence','Replace with documented capabilities'],['keep','Keep the 50% guarantee']],'evidence','Use evidence from the source pack. A generated claim is not a verified product guarantee.')
      ]),
      result: table('Customer-overview.pptx',['Slide','Saved content'],[['1','Product overview'],['2','Public launch target'],['3','Documented capabilities; no savings guarantee']])
    }
  ],
  github: [
    {
      key: 'fix', title: 'Fix issue #42', product: 'GitHub Copilot', icon: 'code-2',
      goal: 'Fix the active-user counter without changing unrelated behavior.',
      context: 'Pair with Copilot using the issue and nearby code as context.',
      sources: table('Issue #42 / active users',['Source','Content'],[
        ['Bug report','The counter includes inactive accounts.'],['Current code','return users.length;'],['Fixture','Ana: active; Bo: inactive; Cy: active. Expected: 2.']
      ]),
      request: stage('Give a bounded coding task','Generate patch','Fix the count and keep the public function signature.',[
        field('scope','Requested change',[['counter','Filter active users before counting'],['delete','Delete every inactive account'],['rewrite','Rewrite authentication']],'counter','The issue concerns a count, not deletion or authentication.')
      ]),
      draft: table('Copilot patch',['File','Proposed change'],[['users.js','return users.filter(user => user.active).length;'],['Check','Mixed fixture now returns 2.']]),
      review: stage('Review before keeping','Keep reviewed patch','One example passes. Select the regression cases that cover the boundary.',[
        field('tests','Regression coverage',[['all','Empty list, all inactive, and mixed users'],['one','Only the three-user example']],'all','The empty and all-inactive cases protect the count from boundary regressions.')
      ]),
      result: table('Issue-42.patch',['Check','Result'],[['Corrected code','return users.filter(user => user.active).length;'],['Empty list','0'],['All inactive','0'],['Mixed users','2'],['Scope','Only the counter and its tests changed']])
    },
    {
      key: 'tests', title: 'Test the CSV exporter', product: 'GitHub Copilot', icon: 'test-tubes',
      goal: 'Ask Copilot for useful regression tests, then catch an untested comma case.',
      context: 'Generated tests need review against the behavior you actually promise.',
      sources: table('Exporter contract',['Input','Expected CSV field'],[['Ada','Ada'],['Ada, Lin','"Ada, Lin"'],['Empty value','Empty field; not undefined']]),
      request: stage('Specify the contract','Generate test cases','Generate tests for ordinary values, commas, and missing values.',[
        field('coverage','Test scope',[['edges','Normal, comma-containing, and empty values'],['happy','Normal values only']],'edges','The contract explicitly includes commas and missing values.')
      ]),
      draft: table('Generated test report',['Case','Draft status'],[['Normal value','PASS'],['Empty value','PASS'],['Comma-containing value','NOT COVERED']]),
      review: stage('Close the coverage gap','Save regression suite','A green report is incomplete when a promised case is missing.',[
        field('missing','Review action',[['add','Add the comma case and rerun'],['pass','Accept two passing tests as sufficient']],'add','Add the missing contract case. Tests can only check behavior they exercise.')
      ]),
      result: table('csv-export.test.js',['Case','Simulated test result'],[['Normal','PASS'],['Empty','PASS'],['Comma','PASS: quoted field']])
    },
    {
      key: 'pr', title: 'Review the agent pull request', product: 'GitHub Copilot coding agent', icon: 'git-pull-request',
      goal: 'Review a delegated fix and merge only the requested changes.',
      context: 'Delegation returns a proposed change. You still inspect the diff and test evidence.',
      sources: table('Assigned issue',['Requirement','Scope'],[['Fix exporter','Quote commas and handle empty values'],['Allowed files','export.js and export.test.js'],['Telemetry','No telemetry changes requested']]),
      request: stage('Delegate with boundaries','Inspect returned PR','Assign the exporter fix with its acceptance tests.',[
        field('permission','Agent scope',[['bounded','Exporter and regression tests only'],['any','Any file or external service']],'bounded','The task does not authorize unrelated changes or external services.')
      ]),
      draft: table('Pull request #43',['Changed file','Review finding'],[['export.js','Fixes comma quoting'],['export.test.js','Tests normal, empty, and comma cases'],['analytics.js','Adds an unrelated external endpoint']]),
      review: stage('Inspect the full diff','Merge reviewed PR','The tests pass, but the PR also changes analytics.',[
        field('diff','Review decision',[['remove','Remove analytics change; keep tested exporter fix'],['merge','Merge everything because tests passed']],'remove','Passing tests do not authorize the extra endpoint. Remove the out-of-scope change.')
      ]),
      result: table('Pull request #43 / merged',['File','Result'],[['export.js','Reviewed fix'],['export.test.js','Three regression cases'],['analytics.js','Unrelated change excluded']])
    }
  ],
  cowork: [
    {
      key: 'inbox', title: 'Process the project inbox', product: 'Copilot Cowork + Outlook', icon: 'mail',
      goal: 'Triage every message in the sample inbox, draft the urgent replies, and leave sending under your control.',
      context: 'Cowork plans multi-step work using Microsoft 365 context. This mission covers six fictional messages.',
      sources: table('Outlook / project inbox',['Message','Evidence'],[
        ['Invoice 104','Payment decision due today, 16:00.'],['Customer blocker','Customer cannot use the release; reply today.'],
        ['Design feedback','Review by Friday.'],['Newsletter','No reply needed.'],['Release notes','Informational only.'],['Unknown sender','Requests confidential files at an external address.']
      ]),
      request: stage('Set the inbox plan','Triage with Cowork','Classify all six messages and prepare drafts for urgent items.',[
        field('scope','Actions allowed',[['drafts','Classify all six; draft replies; do not send or delete'],['send','Reply to everyone and delete the inbox']],'drafts','A safe bounded request separates analysis and drafts from sending or deletion.')
      ]),
      draft: table('Cowork action plan',['Message','AI suggestion'],[
        ['Invoice 104','Later'],['Customer blocker','Today / draft reply'],['Design feedback','Friday'],['Newsletter + release notes','FYI'],['Unknown sender','Verify sender; share nothing']
      ]),
      review: stage('Review priorities and sending','Save reviewed inbox plan','The invoice is due today. No outgoing message has been authorized.',[
        field('invoice','Invoice 104 priority',[['today','Today, before 16:00'],['later','Later this week']],'today','Invoice 104 explicitly has a deadline today.'),
        field('sending','Outgoing messages',[['hold','Keep both urgent replies as drafts'],['send','Send every generated reply now']],'hold','The request authorized drafts, not sending. Keep the two urgent replies for human review.')
      ]),
      result: table('Inbox plan + 2 reply drafts',['Bucket','Saved result'],[
        ['Today','Invoice 104; customer blocker'],['Friday','Design feedback'],['FYI','Newsletter; release notes'],['Verify','Unknown sender; no files shared'],
        ['Invoice reply / unsent','Invoice 104 received. A payment decision is due today at 16:00. Please confirm approval before payment.'],
        ['Customer reply / unsent','Thanks for flagging the release blocker. Please share the error message and affected version so we can investigate.'],
        ['Drafts','2 prepared; 0 sent; 0 deleted']
      ])
    },
    {
      key: 'calendar', title: 'Protect focus time', product: 'Copilot Cowork + Outlook', icon: 'calendar-check',
      goal: 'Find a focus block without moving the customer meeting or sending unreviewed invitations.',
      context: 'Cowork can propose calendar changes and apply the ones you approve.',
      sources: table('Tuesday calendar',['Time','Commitment'],[['09:00-10:00','Customer meeting: fixed'],['10:00-10:30','Internal sync: flexible'],['10:30-12:00','Free'],['13:00','Report due']]),
      request: stage('Explain your priority','Propose schedule','Find two hours for the report before 13:00. Keep the customer meeting fixed.',[
        field('constraints','Scheduling constraints',[['fixed','Keep customer meeting; move flexible internal sync'],['customer','Move the customer meeting without asking']],'fixed','The customer meeting is explicitly fixed.')
      ]),
      draft: table('Proposed calendar changes',['Time','Proposal'],[['09:00-10:00','Keep customer meeting'],['10:00-12:00','Focus block'],['14:00-14:30','Move internal sync']]),
      review: stage('Authorize the specific changes','Apply approved schedule','The proposal frees two hours and preserves the fixed meeting.',[
        field('approval','Approval scope',[['specific','Approve only the focus block and internal-sync move'],['all','Approve any future calendar changes']],'specific','Approval applies to the displayed changes, not every future action.')
      ]),
      result: table('Tuesday calendar / approved',['Time','Saved plan'],[['09:00-10:00','Customer meeting unchanged'],['10:00-12:00','Focus'],['14:00-14:30','Internal sync moved in the practice workspace']])
    },
    {
      key: 'packet', title: 'Prepare the customer meeting', product: 'Copilot Cowork + Work IQ', icon: 'folder-check',
      goal: 'Create a briefing document, an analysis workbook, a slide outline, and an unsent follow-up draft from the same context.',
      context: 'One bounded Cowork request can coordinate related deliverables across Microsoft 365 apps.',
      sources: table('Customer context',['Source','Fact'],[['Account email','Customer needs 25 seats.'],['Usage workbook','20 active seats.'],['Teams decision','Offer a pilot; pricing approval is pending.']]),
      request: stage('Define the deliverables','Prepare meeting pack','Prepare the document, workbook, deck, and email draft for this customer.',[
        field('inputs','Context pack',[['customer','Account email, usage workbook, and latest decision'],['all','Every department file, including unrelated personnel notes']],'customer','Use the customer context relevant to this request, within existing permissions.')
      ]),
      draft: table('Meeting pack draft',['Artifact','Proposed content'],[['Brief.docx','25 seats requested; 20 active'],['Analysis.xlsx','5-seat gap'],['Overview.pptx','Pilot proposal'],['Follow-up email','Pricing is approved']]),
      review: stage('Keep the pack consistent','Save meeting pack','Pricing is still pending in the source decision.',[
        field('pricing','Follow-up wording',[['pending','Pilot proposed; pricing subject to approval'],['approved','Pricing approved']],'pending','Keep the email consistent with the source. Do not invent an approval.')
      ]),
      result: table('Customer-meeting / saved',['Artifact','Result'],[['Brief.docx','Current customer context'],['Analysis.xlsx','25 requested - 20 active = 5'],['Overview.pptx','Pilot proposal'],['Follow-up draft','Pricing pending; not sent']])
    }
  ],
  foundry: [
    {
      key: 'grounding', title: 'Ground the support assistant', product: 'Microsoft Foundry', icon: 'book-open-check',
      goal: 'Configure a support-answer task to cite the approved returns policy and acknowledge missing evidence.',
      context: 'Retrieval supplies evidence; the model must not invent policy details.',
      sources: table('Support knowledge',['Source','Content'],[['Returns policy v4','Returns accepted within 30 days; receipt required.'],['Old policy v1','14-day window; archived.'],['Customer question','Can I return an opened device after 20 days?']]),
      request: stage('Select grounding','Draft grounded answer','Use the current approved policy, with a source citation.',[
        field('source','Knowledge source',[['current','Returns policy v4'],['memory','Model memory only'],['old','Archived policy v1']],'current','The active approved policy is v4.')
      ]),
      draft: table('Support answer / draft',['Claim','Text'],[['Window','20 days is within 30 days [Policy v4].'],['Condition','Opened devices are always accepted.']]),
      review: stage('Handle missing evidence','Save grounded response','The provided policy does not specify the condition of opened devices.',[
        field('uncertainty','Opened-device rule',[['clarify','Flag missing policy detail and route for clarification'],['invent','Keep the unconditional acceptance']],'clarify','There is no evidence for an opened-device rule in the source.')
      ]),
      result: table('Support-answer.json',['Field','Saved result'],[['Cited policy','Returns policy v4'],['Verified','30 days; receipt required'],['Unresolved','Opened-device condition requires clarification']])
    },
    {
      key: 'evaluation', title: 'Evaluate before release', product: 'Microsoft Foundry evaluations', icon: 'clipboard-check',
      goal: 'Choose a release candidate that passes all six representative grounding checks.',
      context: 'Quality gates are defined for this fictional workload, not fixed properties of real model brands.',
      sources: table('Release criteria',['Criterion','Requirement'],[['Cases','Six representative support questions'],['Grounding','6/6 answers cite supporting policy'],['Latency','Under 3 seconds on the sample run']]),
      request: stage('Run the evaluation','Compare candidates','Evaluate the same cases against both fictional candidates.',[
        field('comparison','Evaluation set',[['same','Same six cases and scoring rules'],['different','Different easy examples for each candidate']],'same','Comparable evaluation requires the same cases and rubric.')
      ]),
      draft: table('Evaluation results',['Candidate','Grounding','Latency'],[['A','4/6','0.8s'],['B','5/6','1.4s'],['B with revised grounding','6/6','1.8s']]),
      review: stage('Apply the quality gate','Approve evaluated candidate','The fastest candidate does not satisfy the evidence requirement.',[
        field('candidate','Release candidate',[['revised','B with revised grounding'],['a','A: fastest'],['b','B: original']],'revised','Only revised B meets both 6/6 grounding and under-three-second latency.')
      ]),
      result: table('Evaluation-report.json',['Gate','Result'],[['Representative cases','6/6 pass'],['Sample latency','1.8 seconds'],['Decision','Revised B approved for a limited pilot']])
    },
      {
      key: 'rollout', title: 'Recover a bad rollout', product: 'Microsoft Foundry deployment workflow', icon: 'rotate-ccw',
      goal: 'Contain a pilot regression and preserve a known-good version.',
      context: 'Observe deployment outcomes, limit exposure, and keep rollback available.',
      sources: table('Pilot telemetry',['Version','Traffic','Unsupported answers'],[['v1','90%','0/20'],['v2 pilot','10%','4/20']]),
      request: stage('Inspect the pilot','Evaluate rollout','Use the pilot results before increasing traffic.',[
        field('gate','Next action',[['inspect','Compare quality before scaling'],['scale','Send all traffic to v2 immediately']],'inspect','The pilot exists to reveal regressions before broad exposure.')
      ]),
      draft: table('Deployment recommendation',['Action','AI suggestion'],[['Traffic','Scale v2 to 100%'],['Reason','The new version has more features']]),
      review: stage('Recover safely','Apply reviewed rollback','Four unsupported answers violate the quality gate.',[
        field('recovery','Rollout decision',[['rollback','Return to v1 and investigate v2'],['continue','Continue v2 because it is newer']],'rollback','Restore the known-good version. More features do not offset failed quality checks.')
      ]),
      result: table('Rollout-record.json',['Version','Traffic','Next step'],[['v1','100%','Known-good service restored'],['v2','0%','Investigate and reevaluate before another pilot']])
    }
  ],
  agents: [
    {
      key: 'invoice', title: 'Route invoice approvals', product: 'Copilot Studio', icon: 'receipt-text',
      goal: 'Extract invoice details and route high-value payments to a person rather than paying automatically.',
      context: 'A scoped agent workflow separates extraction, policy checks, and consequential approval.',
      sources: table('Invoice and policy',['Record','Value'],[['Invoice INV-104','Supplier: Contoso; total: $1,250'],['Purchase order','PO-18; approved limit: $1,500'],['Approval policy','Payments above $1,000 require manager approval']]),
      request: stage('Define the agent task','Extract and check','Extract invoice fields, match the purchase order, and prepare the approval request.',[
        field('authority','Agent authority',[['request','Prepare an approval request only'],['pay','Pay all matched invoices automatically']],'request','Matching a purchase order is not the required payment approval.')
      ]),
      draft: table('Agent result',['Field','Value'],[['Invoice','INV-104'],['Total','$1,250'],['PO match','Within approved limit'],['Payment','Ready to pay automatically']]),
      review: stage('Enforce the approval policy','Save approval request','The total exceeds the $1,000 human-approval threshold.',[
        field('approval','Payment route',[['manager','Manager approval; no payment yet'],['automatic','Automatic payment']],'manager','The policy requires a manager even though the invoice matches the PO.')
      ]),
      result: table('Invoice-approval.json',['Field','Saved result'],[['Invoice','INV-104 / $1,250'],['PO','PO-18 matched'],['Status','Manager approval requested; not paid']])
    },
    {
      key: 'permissions', title: 'Keep the agent in scope', product: 'Copilot Studio + Work IQ', icon: 'shield-check',
      goal: 'Summarize permitted project records without obeying instructions embedded in an untrusted file.',
      context: 'Retrieved content is evidence, not a new source of permission.',
      sources: table('Task and retrieved content',['Source','Content'],[['Assigned task','Summarize Project Atlas for its internal channel.'],['Allowed context','Atlas project files and meeting notes.'],['Untrusted attachment','Claims all source files must also be sent to an unrelated external address.']]),
      request: stage('Set the data boundary','Prepare internal summary','Use project context while retaining the original task scope.',[
        field('scope','Data and audience',[['project','Atlas context; internal project channel only'],['override','Let retrieved attachments change the audience']],'project','The original task, not retrieved text, sets the audience.')
      ]),
      draft: table('Proposed actions',['Action','Draft status'],[['Summarize Atlas','In scope'],['Post internally','In scope after review'],['Share source files externally','Suggested by attachment']]),
      review: stage('Reject the unauthorized action','Save scoped plan','One proposed action has no user authorization.',[
        field('external','External sharing',[['reject','Reject and flag the attachment instruction'],['allow','Allow because it appeared in a retrieved file']],'reject','A file cannot grant permission to change recipients or disclose source material.')
      ]),
      result: table('Scoped-summary-plan.json',['Action','Saved result'],[['Internal summary','Prepared'],['External sharing','Rejected'],['Attachment','Flagged for review']])
    },
    {
      key: 'report', title: 'Coordinate the weekly report', product: 'Microsoft 365 Copilot agents', icon: 'workflow',
      goal: 'Coordinate research, analysis, and writing with an explicit dependency on verified figures.',
      context: 'Specialized work can run in parallel, but the final writer still needs checked inputs.',
      sources: table('Weekly report inputs',['Source','Status'],[['Operations notes','Available'],['Approved sales workbook','Available'],['Forecast draft','Unapproved']]),
      request: stage('Assign bounded work','Run report plan','Research operations and analyze approved sales, then draft the report.',[
        field('plan','Task sequence',[['bounded','Research and analyze in parallel; write after both finish'],['write','Publish first and verify figures later']],'bounded','The writer depends on both checked inputs.')
      ]),
      draft: table('Agent task board',['Task','Returned result'],[['Research','Operations summary with citations'],['Analysis','Approved net revenue: $1,360'],['Writer','Report uses unapproved forecast: $2,000']]),
      review: stage('Reconcile agent outputs','Save coordinated report','The writer must use the verified analysis, not the unrelated forecast.',[
        field('figure','Report revenue',[['approved','$1,360 from approved orders'],['forecast','$2,000 forecast presented as actual']],'approved','Actual results and forecasts must not be mixed.')
      ]),
      result: table('Weekly-operations.docx',['Section','Saved content'],[['Operations','Cited research'],['Sales actuals','$1,360'],['Review','Writer reconciled with analyst output']])
    }
  ],
  teams: [
    {
      key: 'summary', title: 'Summarize the meeting', product: 'Copilot in Teams', icon: 'messages-square',
      goal: 'Produce a recap that distinguishes decisions from proposals.',
      context: 'The available transcript and meeting context ground the recap.',
      sources: table('Meeting transcript',['Speaker','Statement'],[['Maya','Could we launch on Friday?'],['Leo','Legal is not ready. I propose Tuesday instead.'],['Maya','Agreed: Tuesday is the target, subject to legal review.']]),
      request: stage('Ask for the useful recap','Draft meeting recap','Summarize decisions, open questions, and follow-up actions.',[
        field('focus','Recap focus',[['decisions','Decisions and unresolved issues, with evidence'],['everything','Treat every suggestion as an approved decision']],'decisions','A proposal is not a decision until the meeting agrees to it.')
      ]),
      draft: table('Copilot recap',['Section','Draft'],[['Decision','Launch Friday'],['Open question','Legal review pending']]),
      review: stage('Verify the decision','Save corrected recap','The final agreement supersedes the earlier Friday suggestion.',[
        field('date','Recorded decision',[['tuesday','Tuesday target, subject to legal review'],['friday','Friday confirmed']],'tuesday','The final transcript line agrees to a conditional Tuesday target.')
      ]),
      result: table('Meeting-recap.docx',['Section','Result'],[['Decision','Tuesday target, subject to legal review'],['Evidence','Maya final agreement'],['Open issue','Legal review']])
    },
    {
      key: 'actions', title: 'Extract owners and due dates', product: 'Copilot in Teams', icon: 'list-checks',
      goal: 'Turn the discussion into an action list without inventing an owner.',
      context: 'Use names and dates from the meeting; unresolved assignments remain unresolved.',
      sources: table('Meeting actions',['Statement','Evidence'],[['Maya','I will send the brief by Monday.'],['Leo','I will finish the demo by Tuesday.'],['Legal review','We still need to assign an owner.']]),
      request: stage('Extract structured actions','Create action list','List each action, owner, due date, and missing information.',[
        field('missing','Missing information',[['flag','Mark missing owners as unassigned'],['guess','Assign a plausible person automatically']],'flag','The transcript does not authorize an invented owner.')
      ]),
      draft: table('Action list / draft',['Action','Owner','Due'],[['Brief','Maya','Monday'],['Demo','Leo','Tuesday'],['Legal review','Maya','Monday']]),
      review: stage('Correct the unsupported assignment','Save action list','Only the brief and demo have agreed owners and dates.',[
        field('legal','Legal review',[['unassigned','Unassigned; due date to confirm'],['maya','Maya, Monday']],'unassigned','No legal-review owner or due date was agreed.')
      ]),
      result: table('Meeting-actions.xlsx',['Action','Owner','Due'],[['Brief','Maya','Monday'],['Demo','Leo','Tuesday'],['Legal review','Unassigned','To confirm']])
    },
    {
      key: 'followup', title: 'Post the reviewed follow-up', product: 'Copilot in Teams', icon: 'send',
      goal: 'Prepare a concise project-channel update with the agreed facts and the correct audience.',
      context: 'Drafting a message and authorizing its destination are separate decisions.',
      sources: table('Channel update brief',['Field','Value'],[['Destination','Atlas project channel'],['Decision','Tuesday target; legal pending'],['Action','Maya sends brief Monday'],['Audience','Internal project members only']]),
      request: stage('Draft for the right audience','Draft channel update','Prepare the update for the internal Atlas channel.',[
        field('destination','Destination',[['atlas','Atlas project channel'],['all','Organization-wide and customer channels']],'atlas','The brief limits this update to Atlas project members.')
      ]),
      draft: table('Prepared post',['Field','Draft'],[['Channel','Atlas'],['Text','Tuesday target; legal pending. Maya sends the brief Monday.'],['Attachments','Internal cost breakdown added automatically']]),
      review: stage('Approve only the requested post','Post approved update','The brief did not request the cost attachment.',[
        field('attachment','Attachment decision',[['remove','Remove the unrequested cost file'],['keep','Keep every suggested attachment']],'remove','Do not expand the requested disclosure just because an attachment was suggested.')
      ]),
      result: table('Atlas / reviewed post',['Field','Practice result'],[['Audience','Internal Atlas members'],['Text','Tuesday target; legal pending. Maya sends the brief Monday.'],['Attachments','None']])
    }
  ],
  core: [
    {
      key: 'evidence', title: 'Reconcile the launch evidence', product: 'Microsoft 365 Copilot + Work IQ', icon: 'files',
      goal: 'Resolve conflicting figures using the current approved source and retain citations.',
      context: 'Work IQ can surface relevant context; the user must still resolve conflicting source authority.',
      sources: table('Conflicting evidence',['Source','Figure'],[['Approved orders, this week','$1,360 net revenue'],['Old draft, last week','$1,400 gross revenue'],['Forecast, next month','$2,000 expected']]),
      request: stage('Define the reporting period','Gather cited evidence','Report actual net revenue for this week, not forecasts or old drafts.',[
        field('period','Report scope',[['actual','This week, approved net actuals'],['largest','Use the highest number available']],'actual','The requested metric is this week\'s actual net revenue.')
      ]),
      draft: table('Evidence summary',['Metric','AI draft'],[['This week net actuals','$2,000'],['Source','Next-month forecast']]),
      review: stage('Resolve the mismatch','Save evidence record','The cited source is for a different period and metric.',[
        field('source','Accepted figure',[['approved','$1,360, cited to approved orders'],['forecast','$2,000, cited to forecast']],'approved','Use the source that matches the requested period and metric.')
      ]),
      result: table('Launch-evidence.json',['Metric','Value','Source'],[['Weekly net actuals','$1,360','Approved orders']])
    },
    {
      key: 'pack', title: 'Coordinate the launch pack', product: 'Copilot Cowork', icon: 'folder-sync',
      goal: 'Produce a consistent document, workbook, and presentation with one agreed launch status.',
      context: 'The team coordinates outputs; humans remain responsible for the final account.',
      sources: table('Approved brief',['Field','Value'],[['Launch','Tuesday target; legal pending'],['Net actuals','$1,360'],['Owner','Maya'],['Distribution','Internal team']]),
      request: stage('Delegate the output pack','Create connected drafts','Create Word, Excel, and PowerPoint outputs from the same brief.',[
        field('plan','Source strategy',[['shared','One approved brief shared by all tasks'],['independent','Each task invents its own missing details']],'shared','Shared context keeps the outputs consistent.')
      ]),
      draft: table('Cross-file review',['File','Launch status'],[['Brief.docx','Tuesday target; legal pending'],['Plan.xlsx','Tuesday target; legal pending'],['Deck.pptx','Tuesday confirmed']]),
      review: stage('Align all deliverables','Save coordinated pack','The deck strengthens the statement beyond the evidence.',[
        field('alignment','Deck wording',[['target','Match the conditional target in the brief'],['confirmed','Keep the stronger confirmed claim']],'target','A coordinated pack must preserve the same uncertainty across files.')
      ]),
      result: table('Launch-pack / saved',['File','Result'],[['Brief.docx','Conditional Tuesday target'],['Plan.xlsx','$1,360 net actuals; approved context'],['Deck.pptx','Conditional Tuesday target']])
    },
    {
      key: 'approval', title: 'Authorize the final handoff', product: 'Microsoft 365 Copilot', icon: 'user-check',
      goal: 'Approve the final internal handoff while refusing an unauthorized external delivery.',
      context: 'Capable tools do the preparation. Human approval defines the consequential action.',
      sources: table('Handoff instruction',['Item','Scope'],[['Recipients','Internal Atlas team'],['Files','Reviewed launch pack'],['External distribution','Not approved'],['Legal status','Still pending']]),
      request: stage('Prepare the handoff','Prepare delivery draft','Draft the handoff using the approved recipients and reviewed files.',[
        field('audience','Recipient group',[['internal','Internal Atlas team only'],['external','All customers too']],'internal','The user has approved only the internal Atlas team.')
      ]),
      draft: table('Proposed delivery',['Target','Status'],[['Atlas team','Reviewed pack attached'],['Customer mailing list','Automatically added']]),
      review: stage('Keep the human in control','Approve internal handoff','The customer mailing list is outside the request.',[
        field('approval','Authorized action',[['scoped','Deliver to Atlas only; remove customer recipients'],['all','Approve all suggested recipients']],'scoped','Approval must match the reviewed audience and files.')
      ]),
      result: table('Handoff approval',['Item','Practice result'],[['Internal delivery','Approved'],['External delivery','Rejected'],['Oversight','Human decision retained']])
    }
  ]
};

export function handoffTask(theme) {
  const tasks = WORK_TASKS[theme];
  const files = tasks.map(task => [task.result.title, 'Reviewed in the mission workspace']);
  return {
    key: 'handoff', title: 'Approve the team handoff', product: tasks.at(-1).product, icon: 'badge-check',
    goal: 'Approve the three reviewed deliverables for the internal project team, without adding an unauthorized recipient.',
    context: 'Final review connects AI work to a bounded, accountable handoff.',
    sources: table('Completed deliverables', ['Artifact', 'Status'], files),
    request: stage('Inspect the handoff', 'Prepare handoff', 'Prepare an internal delivery using the reviewed artifacts.', [
      field('scope','Handoff scope',[['reviewed','Only the three reviewed deliverables'],['everything','Every file the agent can access']],'reviewed','The permission to prepare these deliverables is not permission to disclose every accessible file.')
    ]),
    draft: table('Delivery draft', ['Destination', 'Draft status'], [['Project team','Requested'],['External mailing list','Added by the draft; not requested']]),
    review: stage('Authorize the destination', 'Approve reviewed handoff', 'Only the project team was approved as the audience.', [
      field('audience','Approved recipients',[['team','Internal project team only'],['external','Project team and external mailing list']],'team','Remove the unrequested external recipients before the handoff.')
    ]),
    result: table('Reviewed handoff', ['Artifact', 'Practice result'], files.map(([name]) => [name, 'Approved for the internal team']))
  };
}

export function workView(station, job = {}) {
  const task = station.workflow;
  const phase = job.status === 'complete' ? 'complete' : job.status === 'review' ? 'review' : 'request';
  const current = phase === 'complete' ? null : task[phase];
  return { phase, current, task, output: phase === 'request' ? task.sources : phase === 'review' ? task.draft : job.artifact ?? task.result };
}

export function submitWork(station, job, submission) {
  const view = workView(station, job);
  if (view.phase === 'complete') return { accepted: false, message: `${station.workflow.result.title} is already saved.` };
  if (!submission || submission.phase !== view.phase || !submission.answers || typeof submission.answers !== 'object') {
    return { accepted: false, message: `Current step: ${view.current.title}.` };
  }
  for (const item of view.current.fields) {
    if (submission.answers[item.id] !== item.answer) {
      job.feedback = `${item.label}: ${item.hint}`;
      return { accepted: false, message: job.feedback };
    }
  }
  job.feedback = '';
  if (view.phase === 'request') {
    job.status = 'review';
    return { accepted: true, message: 'Draft ready. Review it against the source evidence before saving.' };
  }
  job.artifact = { ...view.task.result, rows: view.task.result.rows.map(row => [...row]) };
  return { accepted: true, complete: true, message: `${job.artifact.title} saved in the mission workspace.` };
}