export interface CivicKnowledgeDoc {
  id: string
  title: string
  category: 'tax' | 'sanitation' | 'water' | 'electricity' | 'certificate' | 'grievance' | 'metro' | 'animal' | 'zones' | 'general'
  keywords: string[]
  summary: string
  officialProcedure: string[]
  helplines: { name: string; number: string; link?: string }[]
  officialPortals: { name: string; url: string }[]
  faqs: { q: string; a: string }[]
}

export const LUCKNOW_CIVIC_KNOWLEDGE: CivicKnowledgeDoc[] = [
  {
    id: 'lmc-house-tax',
    title: 'Lucknow Municipal Corporation (LMC) House / Property Tax',
    category: 'tax',
    keywords: [
      'house tax', 'property tax', 'grih kar', 'makan tax', 'mutation', 'lmc tax',
      'pay house tax', 'tax rebate', 'tax receipt', 'assessment', 'nagar nigam tax'
    ],
    summary:
      'Lucknow Nagar Nigam levies property tax on residential and non-residential properties within municipal limits. Payments can be made online via the Lucknow Smart City / e-NagarSewa portal or in person at respective Zonal Offices.',
    officialProcedure: [
      'Visit the official portal at lmc.up.nic.in or e-nagarsewa.up.gov.in.',
      'Enter your 10-digit Property ID or search by Zone, Ward, and Owner Name / House Number.',
      'Review your current demand, arrears, and applicable early-bird rebates (typically 10% in April–June).',
      'Pay securely using UPI, Net Banking, Credit/Debit card and download the official payment receipt immediately.',
      'For offline payments, visit your designated LMC Zonal Office (Zone 1 to 8) between 10:00 AM and 03:00 PM on working days.',
    ],
    helplines: [
      { name: 'LMC Citizen Helpline', number: '1533' },
      { name: 'Nagar Nigam House Tax Support', number: '0522-2610651' },
    ],
    officialPortals: [
      { name: 'LMC House Tax Portal', url: 'https://lmc.up.nic.in' },
      { name: 'UP e-NagarSewa', url: 'https://e-nagarsewa.up.gov.in' },
    ],
    faqs: [
      {
        q: 'What is the early bird rebate on Lucknow house tax?',
        a: 'LMC usually offers up to 10% rebate if paid in the first quarter (April–June) of the financial year and 5% in the second quarter.',
      },
      {
        q: 'How to do property mutation (namantaran) in Lucknow?',
        a: 'Submit Form-A at your respective Zonal Office with registered sale deed copy, latest tax receipt, death certificate (if inheritance), and fee challan.',
      },
    ],
  },
  {
    id: 'lmc-sanitation-garbage',
    title: 'Solid Waste Management & Door-to-Door Garbage Collection',
    category: 'sanitation',
    keywords: [
      'garbage', 'kachra', 'safai', 'cleaning', 'solid waste', 'sweeper', 'dustbin',
      'litter', 'eco green', 'drain cleaning', 'nala safai', 'dead animal disposal'
    ],
    summary:
      'Door-to-door municipal solid waste collection across all 8 zones of Lucknow is coordinated by Lucknow Municipal Corporation (Nagar Nigam) sanitation department.',
    officialProcedure: [
      'Door-to-door garbage collection is carried out daily between 06:30 AM and 11:30 AM in residential colonies.',
      'Waste must be segregated into Wet (Green bin / kitchen waste) and Dry (Blue bin / recyclable packaging).',
      'For missed collection or uncleared road garbage mounds, lodge a ticket immediately on LMC 1533 helpline or the Lucknow 311 mobile app.',
      'For dead animal disposal (dog, cattle), call LMC animal helpline or 1533 for specialized van pickup within 4 hours.',
    ],
    helplines: [
      { name: 'LMC 24x7 Control Room & Swachhta Helpline', number: '1533' },
      { name: 'CM Helpline', number: '1076' },
      { name: 'Dead Animal Removal Van', number: '0522-2623048' },
    ],
    officialPortals: [
      { name: 'LMC Swachh Lucknow Portal', url: 'https://lmc.up.nic.in' },
    ],
    faqs: [
      {
        q: 'How to complain about garbage not picked up in my lane?',
        a: 'Call toll-free 1533 with your ward name and colony address, or post on the Lucknow Civic Community feed to escalate directly to @LMC_Lucknow on Twitter/X.',
      },
    ],
  },
  {
    id: 'jal-sansthan-water-sewer',
    title: 'Lucknow Jal Sansthan — Water Supply & Sewerage',
    category: 'water',
    keywords: [
      'water', 'paani', 'sewer', 'drainage', 'jal sansthan', 'water tanker', 'pipeline burst',
      'dirty water', 'water pressure', 'sewer overflow', 'manhole', 'ganda paani'
    ],
    summary:
      'Lucknow Jal Sansthan (Jal Nigam) oversees piped drinking water supply, tube-wells, overhead tanks, and underground sewer maintenance across the city.',
    officialProcedure: [
      'For sewer blockages or overflowing manholes, request a Super Sucker / Jetting Suction machine via Jal Sansthan Central Control Room.',
      'During water supply breakdown, emergency water tankers can be dispatched to your locality upon request.',
      'To report contaminated or muddy water, register a complaint with your Zonal Water Works engineer.',
      'For new domestic water connection, apply online on e-nagarsewa or visit Jal Sansthan Aishbagh / Zonal office with proof of ownership.',
    ],
    helplines: [
      { name: 'Jal Sansthan Central Control Room (24x7)', number: '0522-2239611' },
      { name: 'Jal Sansthan Alternate Helpline', number: '0522-2614488' },
      { name: 'Water Tanker Booking Cell', number: '0522-2239612' },
    ],
    officialPortals: [
      { name: 'UP Jal Sansthan Services', url: 'https://lmc.up.nic.in' },
    ],
    faqs: [
      {
        q: 'How to book an emergency water tanker in Lucknow?',
        a: 'Dial 0522-2239611 or 0522-2239612. Government tankers for emergency breakdowns are dispatched free of cost to affected colonies.',
      },
    ],
  },
  {
    id: 'lesa-electricity',
    title: 'LESA (Lucknow Electricity Supply Administration) / MVVNL',
    category: 'electricity',
    keywords: [
      'electricity', 'bijli', 'power cut', 'transformer', 'light', 'streetlight', 'lesa',
      'madhyanchal', 'voltage', 'power outage', 'electric pole', 'wire sparking'
    ],
    summary:
      'Electricity distribution in urban Lucknow is managed by LESA (a unit of Madhyanchal Vidyut Vitaran Nigam Ltd). Streetlights are co-managed by LMC & EESL.',
    officialProcedure: [
      'To report sudden blackout or line sparking, dial 1912 (24x7 toll-free electricity helpline).',
      'For defective streetlights on municipal poles, register a complaint with LMC toll-free 1533 or online on LMC e-light portal.',
      'For transformer failure, report to local substation (sub-division) or through UP Bijli Mitra WhatsApp bot.',
      'Bill payments & load change: Use the UPPCL official portal (upenergy.in).',
    ],
    helplines: [
      { name: 'LESA 24x7 Electricity Helpline', number: '1912' },
      { name: 'LMC Street Light Toll-Free', number: '1533' },
      { name: 'UPPCL WhatsApp Support', number: '8010924203' },
    ],
    officialPortals: [
      { name: 'UPPCL Official Portal', url: 'https://upenergy.in' },
    ],
    faqs: [
      {
        q: 'How to report a non-functional street light?',
        a: 'Check the pole number written on the street light pole. Call 1533 or post with coordinates on Lucknow Civic Site to alert LMC lighting division.',
      },
    ],
  },
  {
    id: 'birth-death-certificates',
    title: 'Birth and Death Certificate Issuance in Lucknow',
    category: 'certificate',
    keywords: [
      'birth certificate', 'death certificate', 'janam praman patra', 'mrityu praman patra',
      'crs portal', 'nagar nigam certificate', 'hospital birth'
    ],
    summary:
      'Registration of births and deaths occurring within Lucknow municipal limits is legally managed by the Chief Registrar / Nagar Swasthya Adhikari (LMC).',
    officialProcedure: [
      'Events within institutional hospitals are reported directly by the hospital on the Civil Registration System (crsorgi.gov.in).',
      'For events occurring at home, apply within 21 days free of cost at your local LMC Zonal Office or online.',
      'Required documents: Doctor/Hospital discharge slip, parents Aadhaar card, residence proof in Lucknow.',
      'Delayed registration after 21 days up to 1 year requires Medical Officer permission; beyond 1 year requires Sub-Divisional Magistrate (SDM) order.',
    ],
    helplines: [
      { name: 'LMC Health Department (Certificates)', number: '0522-2622727' },
      { name: 'Citizen Helpline', number: '1533' },
    ],
    officialPortals: [
      { name: 'Civil Registration System (CRS)', url: 'https://crsorgi.gov.in' },
      { name: 'UP e-District Portal', url: 'https://edistrict.up.gov.in' },
    ],
    faqs: [
      {
        q: 'Can I download a birth certificate online in Lucknow?',
        a: 'Yes, if registered through crsorgi.gov.in or e-nagarsewa, you can download the digitally signed certificate with the registration number.',
      },
    ],
  },
  {
    id: 'up-jansunwai-grievance',
    title: 'UP Jansunwai / IGRS Integrated Grievance Redressal System',
    category: 'grievance',
    keywords: [
      'jansunwai', 'igrs', 'complaint', 'grievance', 'cm helpline', 'shikayat',
      'escalation', 'first appeal', 'dm lucknow', 'commissioner'
    ],
    summary:
      'The primary official grievance escalation system for all Uttar Pradesh government departments, including LMC, LDA, PWD, Police, and Jal Sansthan.',
    officialProcedure: [
      'Visit jansunwai.up.gov.in or install the Jansunwai-Samadhan UP mobile application.',
      'Register your mobile number via OTP, select District as "Lucknow", select your Tehsil/Ward and the relevant Department.',
      'Upload a clear statement of the issue and photos as PDF/JPG attachment.',
      'You will receive a unique Reference Number (e.g. 4001...) via SMS to track status in real-time.',
      'Citizen Charter SLA: Most civic complaints must be disposed within 7 to 15 working days. If closed unsatisfactorily, file a "First Appeal" on the portal.',
    ],
    helplines: [
      { name: 'UP CM Helpline (Toll-Free 24x7)', number: '1076' },
      { name: 'Lucknow District Magistrate Control Room', number: '0522-2615195' },
    ],
    officialPortals: [
      { name: 'UP Jansunwai Portal', url: 'https://jansunwai.up.gov.in' },
    ],
    faqs: [
      {
        q: 'What if LMC closes my complaint on Jansunwai without solving it?',
        a: 'Submit a feedback score of "Unsatisfied" when prompted by SMS, and immediately trigger a First Appeal (प्रथम अपील) to the Divisional Commissioner.',
      },
    ],
  },
  {
    id: 'upmrc-lucknow-metro',
    title: 'UPMRC Lucknow Metro — Timings, Routes & Smart Card',
    category: 'metro',
    keywords: [
      'metro', 'lucknow metro', 'upmrc', 'red line', 'blue line', 'fare', 'gosmart',
      'metro timings', 'airport metro', 'charbagh metro', 'munshipulia'
    ],
    summary:
      'Lucknow Metro (North-South Red Line) spans 23 km with 21 operational stations from Chaudhary Charan Singh Airport to Munshipulia.',
    officialProcedure: [
      'Operational Timings: 06:00 AM to 10:00 PM every day including Sundays and public holidays.',
      'Frequency: 5–7 minutes during peak rush hours (08:30–11:30 AM & 05:00–08:30 PM).',
      'Fare structure: ₹10 (1 station), ₹15 (2 stations), ₹20 (3–6 stations), ₹30 (7–9 stations), ₹40 (10–13 stations), ₹50 (14–17 stations), ₹60 (18–21 stations).',
      'GoSmart Card: Offers 10% discount on every journey, contactless tap-in, and can be purchased for ₹100 deposit at any station counter.',
      'Key transfer hubs: Charbagh (connects Northern Railway & North Eastern Railway) and CCS International Airport.',
    ],
    helplines: [
      { name: 'UPMRC Lucknow Metro Customer Care', number: '0522-2888888' },
      { name: 'Metro Lost and Found', number: '0522-2888123' },
    ],
    officialPortals: [
      { name: 'UPMRC Official Site', url: 'https://lmrcl.com' },
    ],
    faqs: [
      {
        q: 'Is there parking available at Lucknow metro stations?',
        a: 'Yes, multi-level or surface parking is available at major stations including Transport Nagar, Charbagh, Hazratganj, and Munshipulia.',
      },
    ],
  },
  {
    id: 'lmc-zones-corporators',
    title: 'Lucknow Nagar Nigam 8 Administrative Zones & Offices',
    category: 'zones',
    keywords: [
      'zone', 'zones', 'zonal officer', 'zone 1', 'zone 2', 'zone 3', 'zone 4',
      'zone 5', 'zone 6', 'zone 7', 'zone 8', 'corporator', 'ward'
    ],
    summary:
      'Lucknow Municipal Corporation is decentralized into 8 administrative zones managing 110 municipal wards across trans-Gomti and cis-Gomti sectors.',
    officialProcedure: [
      'Zone 1: Lalbagh, Hazratganj, Qaiserbagh, Narhi (Office: Lalbagh, near Nagar Nigam HQ).',
      'Zone 2: Aishbagh, Kundari Rakabganj, Charbagh, Rajajipuram (Office: Aishbagh Water Works).',
      'Zone 3: Aliganj, Mahanagar, Jankipuram, Triveni Nagar (Office: Kapoorthala, Aliganj).',
      'Zone 4: Gomti Nagar, Gomti Nagar Extension, Malhour, Chinhat (Office: Vishal Khand, Gomti Nagar).',
      'Zone 5: Alambagh, Singar Nagar, Krishna Nagar, Sarojini Nagar (Office: Para / Alambagh).',
      'Zone 6: Chowk, Thakurganj, Kashmiri Mohalla, Daulatganj (Office: Chowk, Old Lucknow).',
      'Zone 7: Indira Nagar, Kalyanpur, Munshipulia, Ring Road (Office: Indira Nagar Sector 14).',
      'Zone 8: South Lucknow, Ashiyana, Bangla Bazar, Shaheed Path, Transport Nagar (Office: VIP Road, Ashiyana).',
    ],
    helplines: [
      { name: 'Nagar Nigam Central Exchange', number: '0522-2622727' },
      { name: 'Mayor Camp Office Lucknow', number: '0522-2615024' },
      { name: 'Municipal Commissioner Office', number: '0522-2623048' },
    ],
    officialPortals: [
      { name: 'Lucknow Municipal Corporation Directory', url: 'https://lmc.up.nic.in' },
    ],
    faqs: [
      {
        q: 'Which zone does Gomti Nagar fall into?',
        a: 'Gomti Nagar and Gomti Nagar Extension fall under Zone 4 with its Zonal office located at Vishal Khand-2, Gomti Nagar.',
      },
      {
        q: 'Which zone does Aliganj and Jankipuram fall into?',
        a: 'Aliganj, Jankipuram, and Mahanagar are under Zone 3 (Office at Kapoorthala Aliganj).',
      },
    ],
  },
  {
    id: 'lmc-pet-dog-license',
    title: 'Pet Dog Registration & Kanha Upvan Animal Welfare',
    category: 'animal',
    keywords: [
      'dog license', 'pet registration', 'rabies', 'kanha upvan', 'stray dogs',
      'pet license', 'veterinary', 'cattle catching'
    ],
    summary:
      'Registration of pet dogs in Lucknow is mandatory under LMC bylaws. Stray dog sterilization (ABC) is coordinated with animal welfare centres.',
    officialProcedure: [
      'Pet owners must register domestic dogs annually via the Lucknow Smart City portal or at LMC Veterinary Officer branch.',
      'Required: Anti-rabies vaccination certificate from registered vet and owner photo ID.',
      'Fees: Small breeds ₹200/year, Large/Guard breeds ₹500/year.',
      'Stray dog aggressive behavior or bite hazard: Call Kanha Upvan / LMC Animal Control cell at 1533 for sterilization and rabies monitoring.',
    ],
    helplines: [
      { name: 'LMC Veterinary Officer & Animal Control', number: '0522-2623048' },
      { name: 'Kanha Upvan Animal Shelter', number: '0522-2970100' },
    ],
    officialPortals: [
      { name: 'Lucknow Smart City Dog Licensing', url: 'https://lmc.up.nic.in' },
    ],
    faqs: [
      {
        q: 'Is dog licensing mandatory in Lucknow?',
        a: 'Yes, keeping an unlicensed pet dog in Lucknow municipal boundary can attract penalties up to ₹5,000 under Nagar Nigam rules.',
      },
    ],
  },
]
