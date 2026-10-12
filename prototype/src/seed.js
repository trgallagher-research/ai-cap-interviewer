/* seed.js: 16 fictional member profiles for the AI at Work Diagnostic (Systeeminterventies).
 *
 * Plain script; one global: window.SEED (array of Profile, see docs/architecture.md). All
 * people are invented. mean/band/divergence match engine.js (verified by tests/seed-check.js).
 * docs/seed-notes.md lists the patterns built in on purpose.
 */
(function () {
  "use strict";

  window.SEED = [

  // ------------------------------------------------------------------ 01 Anneke
  {
    id: "seed_01",
    createdAt: "2026-09-14T09:12:00.000Z",
    source: "seed",
    member: { name: "Anneke", role: "team coach, mostly healthcare organisations", org: "independent" },
    practice: {
      level: 3, levelLabel: "Integrated",
      summary: "Anneke uses Claude and ChatGPT most working days, mainly around team coaching assignments in hospitals and care organisations. She prepares team days with it, digests her own interview notes, and talks through a stuck case before supervision. She keeps it out of the room and strips names from everything she pastes.",
      domains: [
        { key: "prep", evidence: "I give it my intake notes and the team's own words and ask for three different designs for the first team day. I pick one and rebuild it myself." },
        { key: "analysis", evidence: "After twelve one-to-one conversations with a nursing team I had it cluster what people said. It found two themes I had missed." },
        { key: "thinking", evidence: "Before supervision I talk a stuck case through with it. It asks better questions than I expected." },
        { key: "writing", evidence: "Proposals and the report after an assignment: I draft it, it tightens the Dutch, I rewrite the parts that sound like nobody." },
        { key: "learning", evidence: "I used it to understand the new governance structure in one hospital before the intake." }
      ],
      tools: ["Claude", "ChatGPT", "Otter"],
      judgement: "Removes names, roles that identify people and the organisation's name before pasting anything; checks every summary against her own notes. Refuses to use it for anything that goes to a team member directly, and does not use it when a conflict is personal or raw.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Use an AI tool to turn your rough notes after a team intake into a first-draft proposal, and judge what in the draft to keep.", level: 2, rating: 85 },
        { id: "r2", task: "Give an AI tool the anonymised notes from a round of one-to-one conversations with a team and get a clustering of themes you can check against your own reading.", level: 3, rating: 80 },
        { id: "r3", task: "Talk a stuck team coaching case through with an AI tool before supervision, and come out with one hypothesis you had not had yourself.", level: 3, rating: 65 },
        { id: "r4", task: "Write down your own rules for what client material you will and will not paste, in a form a colleague could adopt.", level: 4, rating: 50 }
      ],
      mean: 70, band: "moderate",
      pattern: "Very confident on drafting and digesting her own notes, moderate as a thinking partner, drops when asked to make her method explicit for others."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["make my rules for client material explicit instead of improvising them", "get better at using it as a sparring partner on a case without it flattering me"],
    offers: ["can show how I prepare a team day from intake notes with it", "can show how I cluster interview notes and check the result"],
    questionnaire: {frequency: "daily", uses: ["writing", "prep", "analysis", "thinking", "learning"], tools: ["ChatGPT", "Claude", "Transcription tool"], stance: "pragmatic", offer: ["peer-halfday", "demos"], pay: "yes", canShow: "yes"},
    selfReport: {frequency: "daily", domains: ["writing", "prep", "analysis", "thinking", "learning"], tools: ["ChatGPT", "Claude", "Transcription tool"], canShow: "yes"},
    productSignals: {
      offerKeys: ["peer-halfday", "demos"], pay: "yes",
      wouldPayFor: "A half-day with peers from this network; Short demos from colleagues",
      quote: "I have done the generic course. What I want is to sit with five people who do the same work and compare how we actually use it."
    },
    feedback: {
      headline: "Thanks Anneke: here is what stood out",
      summary: "You described a settled way of working: AI helps you prepare and digest, and you keep it away from the team itself. Your checks are concrete, from stripping names to re-reading every cluster against your own notes. The one place you hesitate is turning those checks into something others could use.",
      strengths: [
        "You have a clear boundary: never in the room, never for anything that goes to a team member directly, and you can say why.",
        "The clustering episode shows you use it to see what you missed rather than to confirm what you already thought."
      ],
      nextSteps: [
        { title: "Write your pasting rules on one page", detail: "Take the rules you already apply (no names, no organisation, nothing raw) and write them as six lines. Use them on your next two assignments and note where they bend. You will know it worked when a colleague can follow them without asking you." }
      ],
      closing: "Your way of working is already something several colleagues in this network would learn from."
    },
    quotes: [
      "I never bring it into the room. The room is the work.",
      "It found two themes I had missed. That was humbling and useful.",
      "I rewrite the parts that sound like nobody."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 02 Bram
  {
    id: "seed_02",
    createdAt: "2026-09-16T13:40:00.000Z",
    source: "seed",
    member: { name: "Bram", role: "independent mediator, labour disputes", org: "independent" },
    practice: {
      level: 1, levelLabel: "Exploring",
      summary: "Bram has tried ChatGPT a handful of times, mostly to summarise a long policy document and once to rephrase an awkward email to a lawyer. He does not use it on anything related to a running mediation because the parties' material is confidential and he does not know where it goes.",
      domains: [
        { key: "writing", evidence: "I had it make one email to a lawyer less angry. That worked, I admit." },
        { key: "learning", evidence: "I pasted a forty-page collective agreement and asked what it said about dismissal procedures. I still read the pages myself afterwards." }
      ],
      tools: ["ChatGPT"],
      judgement: "Will not put anything from a live mediation into a tool he does not understand; reads the original after any summary. Chooses not to use it for anything with emotional weight, which in his work is most of it.",
      stance: "sceptical"
    },
    confidence: {
      items: [
        { id: "r1", task: "Ask an AI tool to summarise a long policy document or collective agreement and check the summary against the original.", level: 1, rating: 55 },
        { id: "r2", task: "Use an AI tool to draft the neutral procedural letter you send both parties at the start of a mediation, with no case details in it, and judge what to keep.", level: 2, rating: 35 },
        { id: "r3", task: "Find out, from the terms and your own IT contact, what happens to text you paste into the tool you use, and decide on that basis what you will never paste.", level: 2, rating: 15 }
      ],
      mean: 35, band: "low",
      pattern: "Moderate on summarising documents, low on anything close to case material, lowest on finding out how the data is handled."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["know what is safe with client material before I go any further", "stop retyping my own notes after a session"],
    offers: [],
    questionnaire: {frequency: "tried", uses: ["writing", "learning"], tools: ["ChatGPT"], stance: "sceptical", offer: ["confidentiality"], pay: "maybe"},
    selfReport: {frequency: "tried", domains: ["writing", "learning"], tools: ["ChatGPT"], canShow: ""},
    productSignals: {
      offerKeys: ["confidentiality"], pay: "maybe",
      wouldPayFor: "A checklist for using it safely with client material",
      quote: "If someone I trust tells me plainly what is and is not safe, that is worth paying for. Another webinar about the future is not."
    },
    feedback: {
      headline: "Thanks Bram: here is what stood out",
      summary: "You use AI rarely and for good reasons: your material is confidential and you do not know where it goes. That is a judgement, not a gap. The two things you did try, summarising a long agreement and softening an email, both worked and both stayed away from case material.",
      strengths: [
        "You read the original after every summary. That habit is what more experienced users have to learn later.",
        "You already distinguish between the procedural side of your work and the emotional side, and keep AI out of the second."
      ],
      nextSteps: [
        { title: "Get a plain answer on the data question", detail: "Ask one person in this network who works with client material which tool they use and what they checked about it. Write down the answer in three lines. You will know it worked when you can say what you will never paste, and why, without hedging." },
        { title: "Try it on your own procedural templates", detail: "Take your standard opening letter, which has no case details, and ask the tool for two shorter versions. Keep what reads like you. This is the lowest-risk material you have, and it tells you whether the tool is any use to you at all." }
      ],
      closing: "Your caution is a strength in this network, not something to apologise for."
    },
    quotes: [
      "I do not know where it goes. Until I do, nothing from a case goes in.",
      "It made one email to a lawyer less angry. That worked, I admit.",
      "Another webinar about the future is not worth my time."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 03 Joris
  {
    id: "seed_03",
    createdAt: "2026-09-18T15:05:00.000Z",
    source: "seed",
    member: { name: "Joris", role: "interim manager in municipalities", org: "independent" },
    practice: {
      level: 2, levelLabel: "Routine",
      summary: "Joris uses Microsoft Copilot daily because that is what every municipality he works in has switched on. He uses it for meeting summaries, drafting memos to the council and council committees, and turning long policy notes into a page.",
      domains: [
        { key: "admin", evidence: "Teams writes the summary of every meeting now. I read it, correct two things, send it. That saves me an hour a day." },
        { key: "writing", evidence: "A memo to the college of mayor and aldermen: I give it the bullets and the tone and it gives me a draft in the house style." },
        { key: "analysis", evidence: "A sixty-page policy note on housing: I ask what it means for my department and read the pages it points to." }
      ],
      tools: ["Microsoft Copilot"],
      judgement: "Uses only the tool the municipality's IT department allows, inside their tenant. Corrects the meeting summary against the recording before sending; does not use it for anything about individual staff, reorganisation or conflict in his team.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Take the Copilot summary of a management team meeting, check it against the recording and send a corrected version within the hour.", level: 2, rating: 80 },
        { id: "r2", task: "Turn a sixty-page policy note into a one-page briefing for your department with the tool, and verify every claim you keep against the source pages.", level: 2, rating: 70 },
        { id: "r3", task: "Use the tool to prepare the structure of a difficult conversation with a department head about performance, without putting their name or details in.", level: 3, rating: 55 },
        { id: "r4", task: "Build a reusable prompt for memos to the council that a successor could use after you leave the assignment.", level: 4, rating: 35 }
      ],
      mean: 60, band: "moderate",
      pattern: "High on the daily routine tasks, moderate on using it to prepare a difficult conversation, low on making anything reusable."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["use it to prepare difficult conversations without feeding it personnel details", "find out whether it can help me sense the mood of a team from meeting minutes, or whether that is a bad idea"],
    offers: [],
    questionnaire: {frequency: "daily", uses: ["writing", "analysis", "admin", "building"], tools: ["Microsoft Copilot"], stance: "pragmatic", offer: ["one-to-one"], pay: "yes", canShow: "maybe"},
    selfReport: {frequency: "daily", domains: ["writing", "analysis", "admin", "building"], tools: ["Microsoft Copilot"], canShow: "maybe"},
    productSignals: {
      offerKeys: ["one-to-one"], pay: "yes",
      wouldPayFor: "An hour with someone looking at how I work",
      quote: "An hour with someone who looks over my shoulder and says: you are wasting time here, try this. That I would pay for."
    },
    feedback: {
      headline: "Thanks Joris: here is what stood out",
      summary: "You have made Copilot part of your working day in a disciplined way: summaries you correct, memos you steer, long notes you read through it. You keep it out of personnel matters on purpose. Your confidence drops exactly where the task moves from documents to people, which fits what you said about your work.",
      strengths: [
        "You check the meeting summary against the recording every time, which many daily users have stopped doing.",
        "You work inside the municipality's tenant and know why, which makes your use defensible to any council."
      ],
      nextSteps: [
        { title: "Rehearse one difficult conversation with it, names out", detail: "Before your next performance conversation, describe the situation in general terms (a department head, a pattern, what you need to say) and ask for three ways to open. Keep none of the words, but notice whether the structure helps. You will know it worked if you went in calmer and needed fewer notes." },
        { title: "Save one prompt for your successor", detail: "Your memo-to-the-council prompt is already in your head. Write it down once with the house-style instructions, test it on next week's memo, and leave it in the team folder. If the next interim uses it, that is your evidence." }
      ],
      closing: "You are the kind of routine user the network needs more of: steady, careful and unexcited."
    },
    quotes: [
      "That saves me an hour a day. I do not need more than that from it.",
      "Nothing about people goes in. Documents, yes. People, no.",
      "Every municipality has Copilot now. Nobody has explained to anyone what to do with it."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 04 Marieke
  {
    id: "seed_04",
    createdAt: "2026-09-21T10:30:00.000Z",
    source: "seed",
    member: { name: "Marieke", role: "trainer, leadership programmes for first-line managers", org: "small bureau" },
    practice: {
      level: 4, levelLabel: "Shaping",
      summary: "Marieke has rebuilt how her bureau designs leadership programmes around AI tools. She keeps a Claude project per client programme with the client's language and her own design principles, has built prompt templates her two colleagues use, and teaches participants a module on using AI for their own reflection. She wrote the bureau's data rules and negotiated them with two clients.",
      domains: [
        { key: "prep", evidence: "Every programme has its own project with the client's words, our design principles and the last three evaluations. I design the next module in conversation with that." },
        { key: "building", evidence: "I built the templates my colleagues use for intake summaries and module designs. They complain about them, which means they use them." },
        { key: "client", evidence: "In the programme, participants use it to reflect on a leadership moment and bring the dialogue to the group. We talk about what it got wrong." },
        { key: "writing", evidence: "Proposals, programme guides, the follow-up mails: all drafted with it, all rewritten by me." },
        { key: "thinking", evidence: "When a group dynamic goes strange I describe it, anonymised, and ask what I am not seeing." },
        { key: "analysis", evidence: "Three hundred evaluation comments from a year of programmes: it clustered them in an afternoon, I checked a sample of forty by hand." }
      ],
      tools: ["Claude", "ChatGPT", "NotebookLM", "Microsoft Copilot"],
      judgement: "Wrote the bureau's rules: no participant names, no 360 feedback text, client-approved tools only. Spot-checks any clustering by hand against a sample. Will not let it write anything that is said to a participant about that participant.",
      stance: "enthusiast"
    },
    confidence: {
      items: [
        { id: "r1", task: "Design a new two-hour module for a first-line manager programme in conversation with your client project, and judge which of its suggestions to drop.", level: 3, rating: 95 },
        { id: "r2", task: "Build a prompt template for intake summaries that a colleague uses without your help.", level: 4, rating: 90 },
        { id: "r3", task: "Run the AI reflection exercise with a group of managers and lead the discussion about where the tool got it wrong.", level: 4, rating: 90 },
        { id: "r4", task: "Negotiate your bureau's data rules with a client's IT or privacy officer and come out with an agreement in writing.", level: 4, rating: 80 },
        { id: "r5", task: "Teach a colleague from another bureau your whole way of working in half a day, so they could repeat it without you.", level: 4, rating: 70 }
      ],
      mean: 85, band: "high",
      pattern: "High across the board, slightly lower on teaching her whole method to someone outside her bureau."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["find peers who are as far along, to compare where it misleads us"],
    offers: ["can show my prompt templates for intake summaries and module design", "can show the AI reflection exercise I run with participants and how I debrief it"],
    questionnaire: {frequency: "daily", uses: ["writing", "prep", "analysis", "thinking", "client", "learning", "building"], tools: ["ChatGPT", "Microsoft Copilot", "Claude", "NotebookLM"], stance: "enthusiast", offer: ["peer-halfday", "demos"], offerOther: "a small group of people who are as far along as I am", pay: "no", canShow: "yes"},
    selfReport: {frequency: "daily", domains: ["writing", "prep", "analysis", "thinking", "client", "learning", "building"], tools: ["ChatGPT", "Microsoft Copilot", "Claude", "NotebookLM"], canShow: "yes"},
    productSignals: {
      offerKeys: ["peer-halfday", "demos"], pay: "no",
      wouldPayFor: "",
      quote: "I would give a session for the network for free. What I would pay for does not exist yet: a small group of people who are as far along as I am."
    },
    feedback: {
      headline: "Thanks Marieke: here is what stood out",
      summary: "You are not using AI, you are designing with it: client projects, templates your colleagues use, a module participants go through, and data rules you negotiated yourself. Your ratings are high everywhere and your descriptions back them up. The one lower rating, teaching your method to an outsider, is the interesting one.",
      strengths: [
        "You turned your judgement into rules other people follow, and checked them with clients' IT departments rather than assuming.",
        "You debrief what the tool got wrong with participants, which teaches the scepticism along with the skill."
      ],
      nextSteps: [
        { title: "Teach one piece of it to someone outside your bureau", detail: "Pick the intake-summary template, the simplest thing you built, and walk one colleague from this network through it in an hour. Watch where they get stuck. You will know it worked when they produce a summary with it the following week without asking you anything." },
        { title: "Keep a misleads log for a month", detail: "You already notice where it misleads you; you said you lacked peers to compare with. Write each case down in one line for four weeks and bring the list to the network. That list is the conversation you said you wanted." }
      ],
      closing: "You are a natural peer teacher for this network, if you want to be."
    },
    quotes: [
      "They complain about the templates, which means they use them.",
      "We talk about what it got wrong. That is the module, really.",
      "What I would pay for does not exist yet."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 05 Fatima
  {
    id: "seed_05",
    createdAt: "2026-09-23T08:50:00.000Z",
    source: "seed",
    member: { name: "Fatima", role: "organisational adviser, co-operatives and housing associations", org: "independent" },
    practice: {
      level: 3, levelLabel: "Integrated",
      summary: "Fatima uses ChatGPT and Perplexity most days in advisory work for housing associations and co-operatives. She reads governance documents through it, talks through board dynamics anonymised, drafts advice and prepares member meetings. Despite this she rated herself low on nearly every task; she does not trust what she cannot fully explain and worries she is doing it wrong.",
      domains: [
        { key: "analysis", evidence: "A housing association's whole set of governance documents: I ask it where the rules contradict each other, then check each one. It is usually right about two out of three." },
        { key: "thinking", evidence: "I describe a board, no names, and ask what a mediator would see. Then I ask what a lawyer would see. Then I decide." },
        { key: "prep", evidence: "Member meetings for a co-operative: I give it the agenda and the tension and ask for three ways to open the difficult item." },
        { key: "writing", evidence: "My advice reports start as a dialogue with it. The final text is mine; I can tell when it is not." },
        { key: "learning", evidence: "Perplexity for new legislation on housing associations, because it shows me the sources." }
      ],
      tools: ["ChatGPT", "Perplexity"],
      judgement: "Anonymises every board and every person; checks factual claims against the source document; uses Perplexity rather than ChatGPT when sources matter. Does not use it when a client has asked her not to, which two have.",
      stance: "cautious"
    },
    confidence: {
      items: [
        { id: "r1", task: "Ask an AI tool where a set of governance documents contradict each other and check each finding against the text.", level: 2, rating: 65 },
        { id: "r2", task: "Talk an anonymised board conflict through with an AI tool from two professional perspectives and come out with a clearer advice.", level: 3, rating: 50 },
        { id: "r3", task: "Prepare the difficult item on a co-operative's member meeting with it, and judge which opening to use.", level: 3, rating: 40 },
        { id: "r4", task: "Explain to a client's board, in five minutes, how you use AI in your work and what you keep out of it.", level: 4, rating: 30 }
      ],
      mean: 46, band: "moderate",
      pattern: "Moderate on document analysis, dropping steadily on case thinking, session preparation and explaining her use to clients, all of which she described doing."
    },
    divergence: { kind: "cautious-practitioner", note: "Rates their confidence well below what their described practice would predict." },
    wants: ["be able to explain to a client how I use it without feeling I am confessing", "see how others check the output on legal and governance questions"],
    offers: ["can show how I read a set of governance documents for contradictions with it"],
    questionnaire: {frequency: "daily", uses: ["writing", "analysis"], tools: ["ChatGPT", "Perplexity"], stance: "cautious", offer: ["one-to-one"], pay: "maybe", canShow: "yes"},
    selfReport: {frequency: "daily", domains: ["writing", "analysis"], tools: ["ChatGPT", "Perplexity"], canShow: "yes"},
    productSignals: {
      offerKeys: ["one-to-one"], pay: "maybe",
      wouldPayFor: "An hour with someone looking at how I work",
      quote: "I want someone to watch me do it and tell me whether I am being careful or just slow."
    },
    feedback: {
      headline: "Thanks Fatima: here is what stood out",
      summary: "You described a careful, layered way of working: contradictions in documents checked one by one, a board looked at through two professional lenses, sources checked with a tool that shows them. Yet you rated yourself low on almost everything you described. The practice is further along than the confidence.",
      strengths: [
        "You switch tools depending on whether sources matter, which is a more sophisticated judgement than most daily users make.",
        "You respect the two clients who asked you not to use it, and said so without being asked."
      ],
      nextSteps: [
        { title: "Say out loud, once, how you use it", detail: "Write the five-minute version of how you use AI and what you keep out of it, and say it to one client you trust at your next meeting. Note their reaction. You will know it worked if the conversation is shorter and calmer than you feared." },
        { title: "Score your own checks for two weeks", detail: "Each time it finds a contradiction in a governance document, mark whether it was right. You said two out of three. Having the actual number will tell you whether your caution is calibrated or just habit." }
      ],
      closing: "You are not slow. You are careful in a way the network can learn from."
    },
    quotes: [
      "I ask what a mediator would see, then what a lawyer would see. Then I decide.",
      "It is usually right about two out of three. I check all three.",
      "Tell me whether I am being careful or just slow."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 06 Dirk
  {
    id: "seed_06",
    createdAt: "2026-09-25T16:20:00.000Z",
    source: "seed",
    member: { name: "Dirk", role: "mediator, conflicts in family businesses and between partners", org: "independent" },
    practice: {
      level: 0, levelLabel: "Not yet",
      summary: "Dirk has not used AI tools in his work and does not intend to soon. His mediations are between family members and business partners, often over decades of history, and he sees nothing a text tool could add. He saw a colleague's AI summary and found it flat; he ended the interview after the ratings.",
      domains: [],
      tools: [],
      judgement: "Has decided, deliberately, not to bring any tool into work that depends on trust between people in a room. Does not want to find out whether it is safe because he does not expect to need it.",
      stance: "sceptical"
    },
    confidence: {
      items: [
        { id: "r1", task: "Open a free AI chat tool and ask it to summarise a one-page article about mediation, then check the summary against the original.", level: 1, rating: 30 },
        { id: "r2", task: "Ask an AI tool to rewrite one of your own standard letters, with no case details, in a shorter form, and decide what to keep.", level: 1, rating: 10 },
        { id: "r3", task: "Use an AI tool to prepare the structure of a first joint session for a family business, without entering any names or facts of the case.", level: 2, rating: 5 }
      ],
      mean: 15, band: "low",
      pattern: "Low throughout; he does not expect to try, and says so."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: [],
    offers: [],
    questionnaire: {frequency: "never", stance: "sceptical", offer: ["nothing"]},
    selfReport: {frequency: "never", domains: [], tools: [], canShow: ""},
    productSignals: {
      offerKeys: [], pay: "",
      wouldPayFor: "",
      quote: "I have thirty years of practice in reading a room. I am not going to ask a machine what to think."
    },
    feedback: {
      headline: "Thanks Dirk: here is what stood out",
      summary: "You have decided not to use AI tools in your mediation work, and your reason is a professional one: the work lives in the trust between people in the room and you see nothing a text tool adds to that. You have seen a colleague's summary and judged it flat. That is a position, not an omission.",
      strengths: [
        "You can say precisely what your work depends on, and why a tool does not touch it.",
        "You judged the one example you saw on its merits rather than on hype in either direction."
      ],
      nextSteps: [
        { title: "No experiment needed; one question to keep", detail: "There is nothing here you need to try. If it ever becomes useful, it is likely to be on the administrative edge of your work, never in the room. The one question worth keeping is what you will say when a client's lawyer turns up with an AI-written summary of the dispute, which is starting to happen." }
      ],
      closing: "The network needs people who hold this line clearly, and you do."
    },
    quotes: [
      "I am not going to ask a machine what to think.",
      "The summary was flat. It had all the facts and none of the family.",
      "If it ever matters, it will be on the admin side. Never in the room."
    ],
    transcript: [],
    endedEarly: true
  },

  // ------------------------------------------------------------------ 07 Sanne
  {
    id: "seed_07",
    createdAt: "2026-09-28T11:15:00.000Z",
    source: "seed",
    member: { name: "Sanne", role: "team coach, in-house at a hospital", org: "in-house at a hospital" },
    practice: {
      level: 1, levelLabel: "Exploring",
      summary: "Sanne is enthusiastic about AI and talks about it a lot with colleagues, but her own use so far is a few tries of Copilot for meeting notes and one attempt at a workshop outline she did not use. The hospital allows only Copilot and she is unsure what she may paste.",
      domains: [
        { key: "admin", evidence: "I let Copilot write the notes of our team coaches' meeting twice. It was fine. I did not check it carefully, I admit." },
        { key: "prep", evidence: "I asked it for an outline for a workshop on feedback for nurses. It gave me something, but I used my own." }
      ],
      tools: ["Microsoft Copilot"],
      judgement: "Has not yet checked what the hospital allows beyond the fact that Copilot is installed; did not check the meeting notes closely. Says she would never put patient or staff details in, but has not had to decide yet.",
      stance: "enthusiast"
    },
    confidence: {
      items: [
        { id: "r1", task: "Let Copilot write the notes of a team meeting, check them against your memory of the meeting, and send a corrected version.", level: 1, rating: 85 },
        { id: "r2", task: "Ask it for three outlines for a workshop on giving feedback for a nursing team and use one as the basis for your own design.", level: 2, rating: 75 },
        { id: "r3", task: "Find out from the hospital's IT or privacy officer exactly what you may paste into Copilot, and write the answer down for the other team coaches.", level: 2, rating: 65 },
        { id: "r4", task: "Use it to prepare a conversation with a ward manager about a team's conflict, without entering any identifying details.", level: 3, rating: 55 }
      ],
      mean: 70, band: "moderate",
      pattern: "High on everything, including tasks she has not yet done; the drop toward client-facing preparation is modest."
    },
    divergence: { kind: "confident-starter", note: "Rates their confidence well above what their described practice would predict." },
    wants: ["use it to prepare workshop designs I actually use", "know what is safe to paste in the hospital's Copilot", "stop retyping meeting notes"],
    offers: [],
    questionnaire: {frequency: "monthly", uses: ["prep", "analysis", "client", "admin"], tools: ["Microsoft Copilot"], stance: "enthusiast", offer: ["peer-halfday", "confidentiality"], pay: "maybe", canShow: "maybe"},
    selfReport: {frequency: "monthly", domains: ["prep", "analysis", "client", "admin"], tools: ["Microsoft Copilot"], canShow: "maybe"},
    productSignals: {
      offerKeys: ["peer-halfday", "confidentiality"], pay: "maybe",
      wouldPayFor: "A half-day with peers from this network; A checklist for using it safely with client material",
      quote: "A morning with other team coaches who show what they do. I would ask the hospital to pay for that."
    },
    feedback: {
      headline: "Thanks Sanne: here is what stood out",
      summary: "Your enthusiasm comes through, and your two tries show you know where it could fit: meeting notes and workshop design. Your ratings run ahead of what you have done so far, which is fine as a starting point but worth noticing. The one task that will unlock the rest is finding out what you may paste.",
      strengths: [
        "You know what you want it for: your own session designs, not generic output, which is the right standard.",
        "You were honest that you did not check the meeting notes closely; that honesty is the start of a verification habit."
      ],
      nextSteps: [
        { title: "Ask the privacy officer one question this week", detail: "Email the hospital's privacy or IT contact: what may I paste into Copilot, and what never? Write the answer in three lines and share it with the other team coaches. You will know it worked when you stop wondering each time." },
        { title: "Redo the feedback workshop outline, properly", detail: "Give it your real constraints (ninety minutes, night-shift nurses, no slides) and ask for three outlines. Take the best structure and build your own content on it. If you use any of it with a real group, that is the test." }
      ],
      closing: "Your energy is an asset; the next two weeks are about matching it with two small, real episodes."
    },
    quotes: [
      "I talk about it more than I use it. I know that.",
      "It gave me something, but I used my own.",
      "Nobody at the hospital has told us what we may paste."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 08 Pieter
  {
    id: "seed_08",
    createdAt: "2026-09-29T14:00:00.000Z",
    source: "seed",
    member: { name: "Pieter", role: "organisational adviser, manufacturing companies and family-owned SMEs", org: "small bureau" },
    practice: {
      level: 2, levelLabel: "Routine",
      summary: "Pieter uses ChatGPT several times a week for proposals, summaries of client documents and the occasional translation, and is openly sceptical about most of what is said about it. He calls it a fast typist with no judgement.",
      domains: [
        { key: "writing", evidence: "Proposals. I give it last year's proposal and the new situation and it gives me a draft that is eighty percent there. The twenty percent is the work." },
        { key: "analysis", evidence: "A client's employee survey: I had it summarise the open comments. Useful, but it made everything sound more reasonable than it was." },
        { key: "admin", evidence: "Translating a proposal for a German parent company. Better than me, faster than the agency." }
      ],
      tools: ["ChatGPT"],
      judgement: "No client names, ever; uses it only in Dutch because he can judge the output better; reads everything twice. Does not use it for anything about a family conflict in a business, because it smooths the edges that matter.",
      stance: "sceptical"
    },
    confidence: {
      items: [
        { id: "r1", task: "Give an AI tool last year's proposal and the new client situation and produce a usable draft in half an hour.", level: 2, rating: 75 },
        { id: "r2", task: "Have it summarise the open comments of an employee survey and spot where it has made things sound more reasonable than they were.", level: 2, rating: 60 },
        { id: "r3", task: "Use it to think through a conflict between two brothers running a company, anonymised, and get one angle you had not considered.", level: 3, rating: 50 },
        { id: "r4", task: "Build a reusable prompt for proposals that your bureau colleagues use.", level: 4, rating: 35 }
      ],
      mean: 55, band: "moderate",
      pattern: "Confident on proposals, moderate on summaries he knows he has to correct, lower on case thinking and building anything reusable."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["find out whether it is any use at all on the relational side, or whether I am right that it is not"],
    offers: [],
    questionnaire: {frequency: "weekly", uses: ["writing", "admin"], tools: ["ChatGPT"], stance: "sceptical", offer: ["nothing"], canShow: "no"},
    selfReport: {frequency: "weekly", domains: ["writing", "admin"], tools: ["ChatGPT"], canShow: "no"},
    productSignals: {
      offerKeys: [], pay: "",
      wouldPayFor: "",
      quote: "I would not pay for anything about AI. I would pay for a good conversation about advising family businesses, and if AI comes up, fine."
    },
    feedback: {
      headline: "Thanks Pieter: here is what stood out",
      summary: "You use it steadily and distrust it steadily, which is a coherent position. Proposals, survey comments, a translation for a German parent: each with a fixed habit and a fixed check. You noticed it makes survey comments sound more reasonable than they are, which is a more precise criticism than most enthusiasts can offer.",
      strengths: [
        "Dutch only, no names, read twice: three rules you actually keep.",
        "You named exactly how it misleads you on survey comments, which means you can catch it."
      ],
      nextSteps: [
        { title: "Test your own claim about the relational side", detail: "You think it is useless on family conflicts. Take one closed case, describe it anonymised in ten lines, and ask what an outsider would notice. If it produces nothing you did not already know, you have your evidence and can stop wondering. If it produces one thing, you have learned something either way." },
        { title: "Ask it to unsmooth the survey", detail: "Next survey, after the summary, ask it to list the five harshest comments verbatim and the three it softened most. Compare with your own reading. That turns your criticism into a check you can run in two minutes." }
      ],
      closing: "A sceptic who uses it is exactly who should be telling the enthusiasts what to watch for."
    },
    quotes: [
      "A fast typist with no judgement. That is all it is, and that is useful.",
      "It made everything sound more reasonable than it was.",
      "The twenty percent is the work."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 09 Lotte
  {
    id: "seed_09",
    createdAt: "2026-09-30T09:45:00.000Z",
    source: "seed",
    member: { name: "Lotte", role: "trainer, conflict skills and feedback for teams", org: "small bureau" },
    practice: {
      level: 2, levelLabel: "Routine",
      summary: "Lotte uses ChatGPT and Gemini regularly to design exercises and role-play scenarios for her conflict skills trainings, and to write the follow-up mails. She has a clear routine but rated herself low on everything, because she is unsure whether what she does counts and because a colleague once called her prompts naive.",
      domains: [
        { key: "prep", evidence: "I ask for ten role-play scenarios about a team member who avoids conflict and pick the two that are not cliches. Every training." },
        { key: "writing", evidence: "The mail after a training with what we agreed: I dictate it messily and it tidies it." },
        { key: "learning", evidence: "I asked it to explain the Thomas-Kilmann model to me as if to a nurse, and used the explanation." }
      ],
      tools: ["ChatGPT", "Gemini"],
      judgement: "Never uses participant names; has a rule not to use it for anything emotional or relational that concerns a real person. Checks scenarios for cliches rather than facts. Unsure whether her way of prompting is good enough.",
      stance: "cautious"
    },
    confidence: {
      items: [
        { id: "r1", task: "Ask an AI tool for ten role-play scenarios for a conflict skills training and pick the two that are not cliches.", level: 2, rating: 55 },
        { id: "r2", task: "Dictate a messy follow-up mail after a training and have the tool tidy it into something you send.", level: 1, rating: 40 },
        { id: "r3", task: "Use it to adapt an existing training design for a very different group, such as warehouse staff instead of policy officers.", level: 2, rating: 30 },
        { id: "r4", task: "Use it to think through why one group did not take to an exercise, and change the design on that basis.", level: 3, rating: 20 }
      ],
      mean: 36, band: "low",
      pattern: "Low throughout, even on the scenario generation she does before every training; lowest on reflection on her own design."
    },
    divergence: { kind: "cautious-practitioner", note: "Rates their confidence well below what their described practice would predict." },
    wants: ["find out whether my way of prompting is good enough or whether I am missing something", "use it to prepare training designs for groups I do not know well"],
    offers: [],
    questionnaire: {frequency: "weekly", uses: ["prep"], tools: ["ChatGPT", "Gemini"], stance: "cautious", offer: ["prompt-library", "demos"], pay: "maybe", canShow: "no"},
    selfReport: {frequency: "weekly", domains: ["prep"], tools: ["ChatGPT", "Gemini"], canShow: "no"},
    productSignals: {
      offerKeys: ["prompt-library", "demos"], pay: "maybe",
      wouldPayFor: "A shared library of prompts from colleagues; Short demos from colleagues",
      quote: "If I could see how five other trainers ask for scenarios, I would know in ten minutes whether I am doing it wrong."
    },
    feedback: {
      headline: "Thanks Lotte: here is what stood out",
      summary: "You have a routine you use before every training, picking the two scenarios out of ten that are not cliches, and a rule about keeping real people out of it. You rated yourself low on all of it, including the parts you do weekly. Someone calling your prompts naive seems to weigh more than your own evidence.",
      strengths: [
        "Your filter, the two out of ten that are not cliches, is a real editorial judgement that the tool cannot make.",
        "Your rule about not using it for anything relational about a real person is clear and you keep it."
      ],
      nextSteps: [
        { title: "Swap scenario prompts with one trainer", detail: "Ask one other trainer in this network to send you the exact prompt they use for scenarios, and send yours. Run both on the same training topic and compare the ten results. You will know in an afternoon whether naive was fair, and you will probably find it was not." },
        { title: "Do the warehouse adaptation on paper first", detail: "Take an existing design and ask the tool to adapt it for a group you know less well, giving it three facts about them. Change what feels wrong. If two of its adaptations survive into the real training, that is your answer on whether you can do this." }
      ],
      closing: "Your practice is further along than your rating; let the comparison with a colleague show you that."
    },
    quotes: [
      "I pick the two that are not cliches. The other eight are useless.",
      "A colleague said my prompts were naive. I have not shown anyone since.",
      "Nothing about a real person goes in. That is my only rule and I keep it."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 10 Tjeerd
  {
    id: "seed_10",
    createdAt: "2026-10-01T13:25:00.000Z",
    source: "seed",
    member: { name: "Tjeerd", role: "interim director, schools and school boards", org: "independent" },
    practice: {
      level: 1, levelLabel: "Exploring",
      summary: "Tjeerd has used ChatGPT a few times to understand education legislation and once to draft a letter to parents he then rewrote entirely. He is worried about what it does to teachers' judgement and to pupils, and about what happens to the data of the schools he leads. He stopped before the last rating because of a board meeting.",
      domains: [
        { key: "learning", evidence: "I asked it to explain the new rules on school funding. It was clearer than the ministry's letter, which worries me in itself." }
      ],
      tools: ["ChatGPT"],
      judgement: "Does not know what happens to the data and has therefore put nothing from a school into it. Worries more about what it does to teachers and pupils than about his own use. Rewrote the one letter it drafted from scratch because it did not sound like a person.",
      stance: "worried"
    },
    confidence: {
      items: [
        { id: "r1", task: "Ask an AI tool to explain a piece of education legislation in plain terms and check the explanation against the ministry's own text.", level: 1, rating: 40 },
        { id: "r2", task: "Draft a letter to parents about a sensitive change with the tool, with no names or school details, and rewrite it into your own voice.", level: 2, rating: 20 },
        { id: "r3", task: "Find out what your school board's policy on AI tools is, or draft one if there is none, with a clear line on pupil and staff data.", level: 3, rating: undefined }
      ],
      mean: 30, band: "low",
      pattern: "Low on both tasks he rated; the third (a board policy on AI and data) was not rated because he had to stop."
    },
    divergence: { kind: "cautious-practitioner", note: "Rates their confidence well below what their described practice would predict." },
    wants: ["know what is safe with staff and pupil data before anything else", "understand what it is doing to teachers' judgement, from someone who is not selling it"],
    offers: [],
    questionnaire: {frequency: "tried", uses: ["writing", "learning"], tools: ["ChatGPT"], stance: "worried", offer: ["confidentiality"], pay: "maybe"},
    selfReport: {frequency: "tried", domains: ["writing", "learning"], tools: ["ChatGPT"], canShow: ""},
    productSignals: {
      offerKeys: ["confidentiality"], pay: "maybe",
      wouldPayFor: "A checklist for using it safely with client material",
      quote: "Give me one page that says what I may and may not do with school data, written by someone who is not trying to sell me something."
    },
    feedback: {
      headline: "Thanks Tjeerd: here is what stood out",
      summary: "You have tried it twice, found it clearer than the ministry and less human than you, and you are worried about the right things: data, and what it does to the judgement of the teachers you lead. You had to stop early, so this feedback rests on less than usual. What you said was precise.",
      strengths: [
        "You judged the parent letter by whether it sounded like a person, and rewrote it when it did not.",
        "Your worry is about your staff and pupils, not yourself, which is the right place for a director to look."
      ],
      nextSteps: [
        { title: "Put the data question on the board agenda", detail: "You did not rate the policy task, but you are the person who can make it happen. Ask at the next board meeting whether there is a policy on AI tools and pupil data, and if not, who owns the question. You will know it worked when there is a name and a date." }
      ],
      closing: "You stopped early and still gave the clearest account of a worry in this whole round."
    },
    quotes: [
      "It was clearer than the ministry's letter, which worries me in itself.",
      "I am not worried about me. I am worried about what it does to a teacher's judgement.",
      "Nothing from a school goes in until someone tells me where it goes."
    ],
    transcript: [],
    endedEarly: true
  },

  // ------------------------------------------------------------------ 11 Noor
  {
    id: "seed_11",
    createdAt: "2026-10-02T10:10:00.000Z",
    source: "seed",
    member: { name: "Noor", role: "executive coach and leadership team coach", org: "independent" },
    practice: {
      level: 3, levelLabel: "Integrated",
      summary: "Noor uses Claude daily as a thinking partner on coaching cases and leadership team work, always anonymised, and has built a routine of preparing each session with it and reviewing her own notes afterwards. She uses an Otter-style transcription tool for her own reflection after sessions, with the client's consent.",
      domains: [
        { key: "thinking", evidence: "After every session I write what I noticed and ask it what I am avoiding. It is annoyingly good at that question." },
        { key: "prep", evidence: "Leadership team offsite: I give it the team's own words from the intakes and ask for the questions I should not forget to ask." },
        { key: "analysis", evidence: "My own session notes over six months with one client: it showed me the same theme coming back four times." },
        { key: "writing", evidence: "Proposals and the end-of-engagement letter. The letter it never gets right, I use it only for the structure." },
        { key: "admin", evidence: "I record my own reflection in the car after a session and it transcribes and tidies it." }
      ],
      tools: ["Claude", "Otter"],
      judgement: "Clients are a letter and a sector, nothing more; the client has consented to her recording her own reflections, not the session. Checks any pattern it finds against the dated notes. Will not use it on a case where the client is in acute distress.",
      stance: "enthusiast"
    },
    confidence: {
      items: [
        { id: "r1", task: "After a coaching session, write what you noticed and ask an AI tool what you are avoiding, and judge whether the answer is true.", level: 3, rating: 90 },
        { id: "r2", task: "Prepare a leadership team offsite with it from the anonymised intake notes and come out with questions you would otherwise have forgotten.", level: 3, rating: 85 },
        { id: "r3", task: "Have it look across six months of your own notes on one client and check the pattern it finds against the dated notes.", level: 3, rating: 70 },
        { id: "r4", task: "Explain your reflection routine to three colleagues in a way they can adopt, including the consent and anonymisation rules.", level: 4, rating: 55 }
      ],
      mean: 75, band: "high",
      pattern: "High on her own reflective routine, drops on turning it into something others can adopt."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["find a way to teach my reflection routine without it sounding like a cult"],
    offers: ["can show my after-session reflection routine, including the consent and anonymisation rules", "can show how I prepare a leadership team offsite from intake notes"],
    questionnaire: {frequency: "daily", uses: ["writing", "prep", "analysis", "thinking", "admin"], tools: ["Claude", "Transcription tool"], stance: "enthusiast", offer: ["peer-halfday"], pay: "yes", canShow: "yes"},
    selfReport: {frequency: "daily", domains: ["writing", "prep", "analysis", "thinking", "admin"], tools: ["Claude", "Transcription tool"], canShow: "yes"},
    productSignals: {
      offerKeys: ["peer-halfday"], pay: "yes",
      wouldPayFor: "A half-day with peers from this network",
      quote: "Put me in a room with four coaches who use it as a thinking partner and I will clear my diary."
    },
    feedback: {
      headline: "Thanks Noor: here is what stood out",
      summary: "You have built a reflective routine around it that most coaches do not have even without AI: what you noticed, what you are avoiding, what keeps coming back. Your limits are precise, a letter and a sector, consent for your own recordings, nothing in acute distress. Your lower rating on teaching it is the honest one.",
      strengths: [
        "The question what am I avoiding is a supervision question, and you ask it after every session.",
        "You check any pattern it finds against the dated notes, which keeps the tool honest."
      ],
      nextSteps: [
        { title: "Teach the routine to one colleague, badly", detail: "Walk one coach from this network through your after-session routine in twenty minutes, rules included, and ask them to try it after their next three sessions. Ask what was unclear. The first version does not have to be good; it has to exist outside your head." }
      ],
      closing: "You are a few sentences away from being able to teach this, and the network would benefit."
    },
    quotes: [
      "It is annoyingly good at asking what I am avoiding.",
      "Clients are a letter and a sector. Nothing more goes in.",
      "The end-of-engagement letter it never gets right. That one is mine."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 12 Harm
  {
    id: "seed_12",
    createdAt: "2026-10-03T15:35:00.000Z",
    source: "seed",
    member: { name: "Harm", role: "organisational adviser, water boards and provincial government", org: "independent" },
    practice: {
      level: 0, levelLabel: "Not yet",
      summary: "Harm has not used AI tools in his work. He reads about them, follows the debate on public-sector use closely, and is worried about what they do to the quality of thinking in the organisations he advises. He sees policy officers paste a Copilot draft and stop thinking.",
      domains: [
        { key: "learning", evidence: "I read everything the Rathenau Instituut and the Autoriteit Persoonsgegevens put out about this. I have not typed a word into one." }
      ],
      tools: [],
      judgement: "Has not used it; wants to understand where the data goes and who is accountable before he does. His main concern is what he sees in clients: drafts that nobody has thought about.",
      stance: "worried"
    },
    confidence: {
      items: [
        { id: "r1", task: "Open a free AI chat tool and ask it to summarise a one-page policy memo, then check the summary against the original.", level: 1, rating: 35 },
        { id: "r2", task: "Ask it to explain a provincial regulation in plain terms and check it against the official text.", level: 1, rating: 15 },
        { id: "r3", task: "Use it to draft the structure of an advisory report for a water board, without entering any confidential material, and decide what to keep.", level: 2, rating: 10 }
      ],
      mean: 20, band: "low",
      pattern: "Low throughout, slightly higher on a first summarising step than on anything in his own work."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["understand what it does to the quality of thinking in government bodies, with evidence", "know what is safe with client material before I try anything"],
    offers: [],
    questionnaire: {frequency: "never", stance: "worried", offer: ["nothing"]},
    selfReport: {frequency: "never", domains: [], tools: [], canShow: ""},
    productSignals: {
      offerKeys: [], pay: "",
      wouldPayFor: "",
      quote: "I would attend something serious about what this does to public organisations. I would not pay for a prompt workshop."
    },
    feedback: {
      headline: "Thanks Harm: here is what stood out",
      summary: "You have not used AI tools and your reasons are thought through: you want to understand the data and accountability side first, and you are worried by what you already see in clients, drafts that nobody has thought about. You read more about this than most people who use it daily.",
      strengths: [
        "You have observed a real effect in your clients, officers who paste and stop thinking, which is worth more than a general worry.",
        "You want to understand accountability before use, which is the question water boards will need answered anyway."
      ],
      nextSteps: [
        { title: "One low-risk experiment, on your own public text", detail: "Take a published report of yours, ask a free tool to summarise it in one page, and mark what it got wrong or flattened. Nothing confidential is involved and you will have your own evidence for the quality concern. If the summary misses what mattered, you have a concrete example for your clients." }
      ],
      closing: "The network needs someone who can say what this does to organisations, not just to individuals, and that is your question."
    },
    quotes: [
      "I see policy officers paste a Copilot draft and stop thinking. That is my worry.",
      "I have read everything about it. I have not typed a word into one.",
      "I would not pay for a prompt workshop."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 13 Esther
  {
    id: "seed_13",
    createdAt: "2026-10-05T09:00:00.000Z",
    source: "seed",
    member: { name: "Esther", role: "mediator, team mediation in healthcare and welfare", org: "small bureau" },
    practice: {
      level: 2, levelLabel: "Routine",
      summary: "Esther uses ChatGPT and NotebookLM for a fixed set of tasks around team mediations: summarising her own anonymised notes after each round, drafting the procedural letters, and reading up on a sector before an intake. She asked her bureau's IT person what was allowed and follows that.",
      domains: [
        { key: "analysis", evidence: "After a round of individual talks I put my own anonymised notes into NotebookLM and ask what the parties agree on without knowing it. It is good at that." },
        { key: "writing", evidence: "The procedural letters, the confirmation of agreements: standard texts, it drafts, I check every sentence." },
        { key: "learning", evidence: "Before an intake at a youth care organisation I asked it to explain how youth care is funded. Enough to not sound ignorant." }
      ],
      tools: ["ChatGPT", "NotebookLM"],
      judgement: "Asked the bureau's IT contact what was allowed and uses only that; anonymises her own notes before they go in; never enters anything a party said in the room verbatim. Does not use it for the agreement text itself, which the parties write.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Put your own anonymised notes from a round of individual talks into a tool and ask what the parties agree on without knowing it, then check against your notes.", level: 2, rating: 80 },
        { id: "r2", task: "Draft the standard procedural letters for a team mediation with it and check every sentence before sending.", level: 2, rating: 70 },
        { id: "r3", task: "Read up on a sector you do not know before an intake with it, and know which claims to double-check.", level: 2, rating: 60 },
        { id: "r4", task: "Use it to think through a mediation that has stalled, anonymised, and come out with one intervention you had not considered.", level: 3, rating: 35 }
      ],
      mean: 61, band: "moderate",
      pattern: "Confident on her routine tasks, drops sharply on using it as a thinking partner on a stalled case."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["use it to think through a stalled case without it giving me textbook answers", "see how colleagues anonymise their notes"],
    offers: [],
    questionnaire: {frequency: "weekly", uses: ["writing", "analysis", "thinking", "learning"], tools: ["ChatGPT", "NotebookLM"], stance: "pragmatic", offer: ["prompt-library", "confidentiality"], pay: "maybe", canShow: "maybe"},
    selfReport: {frequency: "weekly", domains: ["writing", "analysis", "thinking", "learning"], tools: ["ChatGPT", "NotebookLM"], canShow: "maybe"},
    productSignals: {
      offerKeys: ["prompt-library", "confidentiality"], pay: "maybe",
      wouldPayFor: "A shared library of prompts from colleagues; A checklist for using it safely with client material",
      quote: "I would pay a small amount for a folder of prompts from people in this network, with a line on what they use each one for."
    },
    feedback: {
      headline: "Thanks Esther: here is what stood out",
      summary: "You have a tidy routine: notes in, common ground out, letters drafted and checked, a sector read up before intake. You asked IT what was allowed instead of guessing, and you keep the room out of it. Your confidence drops exactly where your practice stops, at using it on a stalled case.",
      strengths: [
        "Asking what the parties agree on without knowing it is a mediator's question, and you found a tool use that serves it.",
        "You asked your IT contact and follow the answer, which few members have done."
      ],
      nextSteps: [
        { title: "Try one stalled case, anonymised, with a specific ask", detail: "Take a mediation that has stalled, describe it in ten anonymised lines, and instead of asking what to do, ask what each party is afraid of losing. Compare with your own reading. You will know it worked if one line changes how you open the next joint session." },
        { title: "Write down your anonymisation steps", detail: "You do it every time; write the five steps once and share them with one colleague who asked the same question. If they can follow it, you have something the network can use." }
      ],
      closing: "You are closer to the thinking-partner use than your rating suggests; one careful try will tell."
    },
    quotes: [
      "I ask what the parties agree on without knowing it. It is good at that.",
      "I asked IT what was allowed. Nobody else in my bureau had.",
      "The agreement text is theirs. That never goes near it."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 14 Kwame
  {
    id: "seed_14",
    createdAt: "2026-10-06T14:45:00.000Z",
    source: "seed",
    member: { name: "Kwame", role: "organisational development adviser, in-house at a university of applied sciences", org: "in-house at a university of applied sciences" },
    practice: {
      level: 3, levelLabel: "Integrated",
      summary: "Kwame works on change programmes and team development inside a hogeschool (university of applied sciences) and uses Copilot and NotebookLM as part of his method: digesting evaluation data and interview rounds, designing interventions, and sparring on faculty politics anonymised. He has helped two teams set up their own Copilot habits.",
      domains: [
        { key: "analysis", evidence: "Forty interviews about a faculty merger: I put my notes in NotebookLM and interrogated them for a week. I knew the material better than if I had only reread it." },
        { key: "prep", evidence: "Every intervention design starts with me telling it what the team said and what I want to happen, and arguing with the result." },
        { key: "thinking", evidence: "Faculty politics, anonymised: I ask it what the dean would hear if I said this. It is a decent dean." },
        { key: "client", evidence: "I helped two teams set up a shared Copilot notebook for their own meeting notes and decisions. One still uses it." },
        { key: "writing", evidence: "Change communications, board memos. It drafts the boring half; the half that has to land, I write." }
      ],
      tools: ["Microsoft Copilot", "NotebookLM"],
      judgement: "Works inside the institution's tenant; strips names and faculties from interview notes; checks any claim from the notes against the source interview. Does not use it in the room, and not for anything about an individual's performance.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Put your notes from a round of forty interviews into a tool and interrogate them until you know the material better than by rereading.", level: 3, rating: 85 },
        { id: "r2", task: "Design a team intervention by telling the tool what the team said and arguing with its proposal, and judge what to keep.", level: 3, rating: 80 },
        { id: "r3", task: "Test a difficult message on it as if it were the dean, anonymised, before you send it.", level: 3, rating: 70 },
        { id: "r4", task: "Help a team set up its own shared notebook for meeting notes so they keep using it after you leave.", level: 4, rating: 60 },
        { id: "r5", task: "Write your institution's practical rules for using AI on interview and evaluation data, in a form the privacy officer signs off.", level: 4, rating: 45 }
      ],
      mean: 68, band: "moderate",
      pattern: "High on his own analytical and design use, moderate on helping teams adopt it, lowest on writing institutional rules."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["get the institution's rules for AI on interview data written and signed off", "find out how others keep a team using a tool after the adviser leaves"],
    offers: ["can show how I interrogate a round of interview notes in NotebookLM", "can show how I argue with it when designing an intervention"],
    questionnaire: {frequency: "weekly", uses: ["writing", "prep", "analysis", "thinking", "client"], tools: ["Microsoft Copilot", "NotebookLM"], stance: "pragmatic", offer: ["peer-halfday", "prompt-library"], pay: "yes", canShow: "yes"},
    selfReport: {frequency: "weekly", domains: ["writing", "prep", "analysis", "thinking", "client"], tools: ["Microsoft Copilot", "NotebookLM"], canShow: "yes"},
    productSignals: {
      offerKeys: ["peer-halfday", "prompt-library"], pay: "yes",
      wouldPayFor: "A half-day with peers from this network; A shared library of prompts from colleagues",
      quote: "The hogeschool would pay for a half-day if it is with people who do my kind of work. Not for another vendor session."
    },
    feedback: {
      headline: "Thanks Kwame: here is what stood out",
      summary: "You described a method, not a tool habit: interview notes interrogated for a week, intervention designs argued over, messages tested on an imaginary dean. You also helped two teams build their own habit, and were honest that only one kept it. Your confidence drops where the work becomes institutional rules, which fits.",
      strengths: [
        "Interrogating forty interviews until you know them better than by rereading is a genuine analytical practice, with a check against the source.",
        "You were honest that one of two teams dropped the habit, and curious why."
      ],
      nextSteps: [
        { title: "Draft the data rules in one page and send them to the privacy officer", detail: "You rated this lowest. Write what you already do (tenant only, names and faculties stripped, source check) as six rules and send them to the privacy officer for comment, not approval. You will know it worked when you get a reply with edits instead of silence." },
        { title: "Ask the team that stopped why they stopped", detail: "Twenty minutes with the team that dropped the shared notebook. Ask what got in the way. That answer is worth more to this network than the success story." }
      ],
      closing: "You could show two or three colleagues here how to work with interview material; it would be a good use of an afternoon."
    },
    quotes: [
      "I interrogated the notes for a week. I knew the material better than if I had only reread it.",
      "I ask what the dean would hear if I said this. It is a decent dean.",
      "The half that has to land, I write."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 15 Wouter
  {
    id: "seed_15",
    createdAt: "2026-10-08T11:50:00.000Z",
    source: "seed",
    member: { name: "Wouter", role: "trainer, communication and feedback skills for teams", org: "small bureau" },
    practice: {
      level: 1, levelLabel: "Exploring",
      summary: "Wouter has tried ChatGPT a few times for a LinkedIn post and for ideas for an energiser, and uses the transcription in Teams when a client has it on. He is not against it, but it has not found a place in his week yet; his trainings are built from a method he has used for years.",
      domains: [
        { key: "writing", evidence: "A LinkedIn post about psychological safety. It was fine. I did not post it; it sounded like everyone else's." },
        { key: "prep", evidence: "I asked for ten energisers for a group that sits all day. Two were new to me." }
      ],
      tools: ["ChatGPT", "Microsoft Teams transcription"],
      judgement: "Has not needed to decide anything about client data because nothing from a client has gone in. Judges output by whether it sounds like him, and mostly it does not.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Ask an AI tool for ten energisers for a group that has been sitting all day, and pick the ones you would actually run.", level: 1, rating: 65 },
        { id: "r2", task: "Dictate your notes after a training day into a tool and have it turn them into the follow-up mail you send the client.", level: 2, rating: 45 },
        { id: "r3", task: "Give it your own training design and ask what a participant who hates role-play would think of it, and use one point.", level: 3, rating: 25 }
      ],
      mean: 45, band: "moderate",
      pattern: "Moderate on generating ideas, lower on the notes-to-mail task he wants, low on using it to critique his own design."
    },
    divergence: { kind: "aligned", note: "Confidence and described practice are broadly in step." },
    wants: ["stop retyping my notes after a training day", "use it to prepare a training for a group I have not met"],
    offers: [],
    questionnaire: {frequency: "tried", uses: ["writing", "prep", "admin"], tools: ["ChatGPT", "Transcription tool"], stance: "pragmatic", offer: ["demos"], pay: "no"},
    selfReport: {frequency: "tried", domains: ["writing", "prep", "admin"], tools: ["ChatGPT", "Transcription tool"], canShow: ""},
    productSignals: {
      offerKeys: ["demos"], pay: "no",
      wouldPayFor: "",
      quote: "I would come to something from the network if it is two hours and I leave with one thing I can use on Monday."
    },
    feedback: {
      headline: "Thanks Wouter: here is what stood out",
      summary: "You have tried it on the edges of your work and it has not yet earned a place: the LinkedIn post sounded like everyone else, the energisers gave you two new ones. You named the one task where it would clearly help, retyping your notes after a training day. That is the right place to start.",
      strengths: [
        "You judge output by whether it sounds like you, and you did not post what did not.",
        "You know precisely which chore you want gone, which most members had to think about."
      ],
      nextSteps: [
        { title: "Dictate the notes after your next training", detail: "In the car or the train after your next training day, record three minutes of what happened and what you agreed. Paste the transcript into the tool and ask for the follow-up mail in your words, short. Send it after editing. If it took less time than retyping, you have your use." }
      ],
      closing: "One real chore solved will tell you more than any course."
    },
    quotes: [
      "It sounded like everyone else's post, so I did not post it.",
      "Two of the ten energisers were new to me. That is something.",
      "I want to stop retyping my notes. That is all I want from it, for now."
    ],
    transcript: [],
    endedEarly: false
  },

  // ------------------------------------------------------------------ 16 Ilse
  {
    id: "seed_16",
    createdAt: "2026-10-10T16:05:00.000Z",
    source: "seed",
    member: { name: "Ilse", role: "team coach and supervisor, education and childcare organisations", org: "independent" },
    practice: {
      level: 0, levelLabel: "Not yet",
      summary: "Ilse has not used AI tools in her work. She is not against them and expects she could pick them up quickly, as she did with other tools, but her work has not needed it: her supervision and team coaching run on conversation and handwritten notes.",
      domains: [],
      tools: [],
      judgement: "Has not had to decide anything about data yet and says she would ask a colleague before pasting anything. Chooses not to use it because nothing in her week has called for it, not out of principle.",
      stance: "pragmatic"
    },
    confidence: {
      items: [
        { id: "r1", task: "Open a free AI chat tool and ask it to summarise a one-page article on team development, then check the summary against the original.", level: 1, rating: 80 },
        { id: "r2", task: "Type up your handwritten notes after a supervision session, with no names, and have the tool turn them into three questions for the next session.", level: 2, rating: 70 },
        { id: "r3", task: "Ask it for three ways to open a team session where two subgroups are not talking, giving it only the general situation, and judge which is usable.", level: 2, rating: 65 }
      ],
      mean: 72, band: "high",
      pattern: "Fairly confident on first steps she has not taken, dropping as the task moves into her own sessions."
    },
    divergence: { kind: "confident-starter", note: "Rates their confidence well above what their described practice would predict." },
    wants: ["see one example of a team coach using it for session preparation before I decide whether it is for me"],
    offers: [],
    questionnaire: {frequency: "never", stance: "pragmatic", offer: ["nothing"]},
    selfReport: {frequency: "never", domains: [], tools: [], canShow: ""},
    productSignals: {
      offerKeys: [], pay: "",
      wouldPayFor: "",
      quote: "Show me one colleague doing one real thing with it. Then I will know in ten minutes."
    },
    feedback: {
      headline: "Thanks Ilse: here is what stood out",
      summary: "You have not used AI tools and are matter-of-fact about it: nothing in your week has asked for it. You rated yourself fairly confidently on first steps you have not yet taken, which is reasonable for someone who picks tools up quickly, but worth testing against one real try. Your handwritten notes are the obvious place.",
      strengths: [
        "You are neither anxious nor excited about it, which makes you a good judge of whether it is useful.",
        "You already have a rule in waiting: ask a colleague before pasting anything."
      ],
      nextSteps: [
        { title: "One try on your own supervision notes, names out", detail: "After your next supervision session, type up your notes without names and ask a free tool for three questions for the next session. Keep the one you would ask anyway and note whether the other two are any good. Fifteen minutes, nothing confidential, and your rating becomes a fact instead of a guess." }
      ],
      closing: "You asked to see one colleague do one real thing; this network has several who can."
    },
    quotes: [
      "Nothing in my week has asked for it. When it does, I will look.",
      "I would ask a colleague before I pasted anything. That seems obvious.",
      "Show me one colleague doing one real thing with it."
    ],
    transcript: [],
    endedEarly: false
  }
  ];
})();
