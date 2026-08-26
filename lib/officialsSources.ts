// Static, hand-compiled MLA and Mayor list for Lucknow district — replaces
// Bengaluru's lib/officialsSources.ts, which fetched two live CSVs from
// OpenCity's CKAN portal (data.opencity.in). That portal has no Lucknow
// dataset, so there is nothing to fetch live here; this is a committed,
// verified snapshot instead.
//
// Names and parties were checked against Wikipedia constituency pages and
// public 2022 Uttar Pradesh Legislative Assembly election results as of the
// build date below. Phone numbers and email addresses are deliberately NOT
// included — we have no verified source for either and do not want to
// publish guessed contact details on a civic-information page. Anyone with a
// verified office number for one of these offices is welcome to add it.
//
// If UP holds an assembly election before this list is refreshed, or a
// by-election changes one of these seats, this file will be out of date —
// check the constituency's Wikipedia page or the Election Commission of
// India's results before relying on it for anything important.

export const MLA_DIRECTORY_VERIFIED_AT = '2026-08-25'

export interface MlaRecord {
  constituency: string
  /** Assembly constituency number, as used by the Election Commission of India. */
  acNo: string
  name: string
  party: string
}

export const MLA_RECORDS: MlaRecord[] = [
  { acNo: '166', constituency: 'Malihabad', name: 'Jai Devi', party: 'BJP' },
  { acNo: '167', constituency: 'Bakshi Ka Talab', name: 'Yogesh Shukla', party: 'BJP' },
  { acNo: '168', constituency: 'Sarojini Nagar', name: 'Rajeshwar Singh', party: 'BJP' },
  { acNo: '169', constituency: 'Lucknow West', name: 'Armaan Khan', party: 'SP' },
  { acNo: '170', constituency: 'Lucknow North', name: 'Neeraj Bora', party: 'BJP' },
  { acNo: '171', constituency: 'Lucknow East', name: 'Ashutosh Tandon', party: 'BJP' },
  { acNo: '172', constituency: 'Lucknow Central', name: 'Ravidas Mehrotra', party: 'SP' },
  { acNo: '173', constituency: 'Lucknow Cantt', name: 'Brajesh Pathak', party: 'BJP' },
  { acNo: '174', constituency: 'Mohanlalganj', name: 'Amaresh Kumar', party: 'BJP' },
]

export interface MayorRecord {
  name: string
  party: string
}

export const MAYOR: MayorRecord = { name: 'Sushma Kharakwal', party: 'BJP' }

export interface MpRecord {
  constituency: string
  name: string
  party: string
}

// Lucknow's single Lok Sabha seat. Checked against 2024 general election
// results (Rajnath Singh has held it since 2014).
export const MP: MpRecord = { constituency: 'Lucknow', name: 'Rajnath Singh', party: 'BJP' }

export const LMC_CORPORATOR_DIRECTORY_VERIFIED_AT = '2026-08-26'

export interface CorporatorRecord {
  wardNo: number
  wardName: string
  name: string
  party: string
}

// All 110 wards of the 2023 Lucknow Municipal Corporation election, transcribed
// programmatically from the "Elected corporators of the different parties"
// table on Wikipedia's 2023_Lucknow_Municipal_Corporation_election article
// (source cited there: AajTak, 2023-05-13) — parsed from the raw wikitext by
// script rather than hand-typed or read off an AI summary, specifically to
// avoid transcription slips across 110 rows (the table uses HTML rowspans for
// wards sharing one winning party, which an early summarization pass got
// wrong on at least one row). The per-party tally this produces (BJP 80,
// SP 21, INC 4, IND 4, BSP 1) matches Wikipedia's own summary row exactly.
//
// Ward names/numbers here are the 2023 delimitation and will NOT generally
// line up with the 2018 ward polygons served at public/geojson/lucknow-wards.geojson
// (see lib/wards.ts) — two different, real delimitations, not an error in
// either. Some names carry apparent typos/inconsistent transliteration from
// the source table itself (e.g. "Shaheed Bhagar Singh", "Kargapur Sarsava")
// — left as-is rather than silently "corrected" against a guess.
export const CORPORATOR_RECORDS: CorporatorRecord[] = [
  { wardNo: 1, wardName: 'Shraddhya Atal Bihari Vajpayee', name: 'Chandawati', party: 'SP' },
  { wardNo: 2, wardName: 'Sharda Nagar - II', name: 'Draupadi', party: 'BJP' },
  { wardNo: 3, wardName: 'Ibrahimpur - II', name: 'Muskan Bharti', party: 'SP' },
  { wardNo: 4, wardName: 'Ibrahimpur - I', name: 'Brij Mohan Sharma', party: 'BJP' },
  { wardNo: 5, wardName: 'Raja Bijli Pasi - II', name: 'Pinki', party: 'BJP' },
  { wardNo: 6, wardName: 'Raja Bijli Pasi - I', name: 'Rajni Yadav', party: 'SP' },
  { wardNo: 7, wardName: 'Lal Ji Tandon', name: 'Roshini', party: 'BJP' },
  { wardNo: 8, wardName: 'Ambedkar Nagar', name: 'Shubhash Chandra', party: 'SP' },
  { wardNo: 9, wardName: 'Kalyan Singh', name: 'Asha Rawat', party: 'SP' },
  { wardNo: 10, wardName: 'Sarojini Nagar - I', name: 'Geeta Devi', party: 'BJP' },
  { wardNo: 11, wardName: 'Shaheed Bhagar Singh - II', name: 'Ramu', party: 'SP' },
  { wardNo: 12, wardName: 'Kargapur Sarsava', name: 'Rajesh Kumar', party: 'SP' },
  { wardNo: 13, wardName: 'Shaheed Bhagar Singh - I', name: 'Yogyata Yadav', party: 'BJP' },
  { wardNo: 14, wardName: 'Bharwara Malhaur', name: 'Mamta Rawat', party: 'SP' },
  { wardNo: 15, wardName: 'Lal Bahadur Shastri - I', name: 'Surendra Kumar Valmiki', party: 'IND' },
  { wardNo: 16, wardName: 'Faizullaganj - IV', name: 'Ramu', party: 'BJP' },
  { wardNo: 17, wardName: 'Vikramaditya - Mahatama Gandhi', name: 'Amit Chaudhary', party: 'BSP' },
  { wardNo: 18, wardName: 'Sarojini Nagar - II', name: 'Ram Naresh', party: 'BJP' },
  { wardNo: 19, wardName: 'Sharda Nagar - I', name: 'Himanshu Ambedkar', party: 'BJP' },
  { wardNo: 20, wardName: 'New Haiderganj - III', name: 'Vinod Kumar Yadav', party: 'BJP' },
  { wardNo: 21, wardName: 'Malviya Nagar', name: 'Mamta Chaudhary', party: 'INC' },
  { wardNo: 22, wardName: 'Jankipuram - III', name: 'Dipak Kumar Lodhi', party: 'BJP' },
  { wardNo: 23, wardName: 'Gurunanak Nagar', name: 'Piyush Diwan', party: 'BJP' },
  { wardNo: 24, wardName: 'Saadatganj', name: 'Shiv Kumar Yadav', party: 'BJP' },
  { wardNo: 25, wardName: 'Babu Kunj Bihari - Omnagar', name: 'Sarita Mishra', party: 'BJP' },
  { wardNo: 26, wardName: 'Aishbagh', name: 'Sandeep Sharma', party: 'BJP' },
  { wardNo: 27, wardName: 'Balaganj', name: 'Kamlesh Kumari Diwedi', party: 'BJP' },
  { wardNo: 28, wardName: 'Rammohan Rai', name: 'Madhu Singh', party: 'BJP' },
  { wardNo: 29, wardName: 'Kharika - II', name: 'Rajni Awasthi', party: 'BJP' },
  { wardNo: 30, wardName: 'Kharika - I', name: 'Krishna Narayan Singh', party: 'BJP' },
  { wardNo: 31, wardName: 'Jankipuram - I', name: 'Nisha Tiwari', party: 'BJP' },
  { wardNo: 32, wardName: 'Alamnagar', name: 'Rekha Singh', party: 'BJP' },
  { wardNo: 33, wardName: 'Lalkuan', name: 'Shushil Kumar Tiwari', party: 'BJP' },
  { wardNo: 34, wardName: 'Hazratganj - Ramtirth', name: 'Nagendra Singh Chauhan', party: 'BJP' },
  { wardNo: 35, wardName: 'Hind Nagar', name: "Saurabh Singh 'Monu'", party: 'BJP' },
  { wardNo: 36, wardName: 'Kesari Kheda', name: 'Devendra Singh Yadav', party: 'SP' },
  { wardNo: 37, wardName: 'Gomti Nagar', name: 'Kaushal Shankar Pandey', party: 'INC' },
  { wardNo: 38, wardName: 'Kanhaiya - Madhavpur - II', name: 'Md. Shakir', party: 'IND' },
  { wardNo: 39, wardName: 'New Haiderganj - II', name: 'Dharmendra Kumar Singh', party: 'BJP' },
  { wardNo: 40, wardName: 'Indira Priyadarshini', name: 'Kalpana Verma', party: 'BJP' },
  { wardNo: 41, wardName: 'Ram Ji Lal - Sardar Patel Nagar', name: 'Sandhya Mishra', party: 'BJP' },
  { wardNo: 42, wardName: 'Shankarpurva - II', name: 'Shivam Upadhya', party: 'BJP' },
  { wardNo: 43, wardName: 'Ismailganj - II', name: 'Ranjana Awasthi', party: 'BJP' },
  { wardNo: 44, wardName: 'Faizullaganj - II', name: 'Priyanka', party: 'BJP' },
  { wardNo: 45, wardName: 'Guru Govind Singh', name: 'Shravan Nayak', party: 'BJP' },
  { wardNo: 46, wardName: 'Kunwar Jyoti Prasad', name: 'Gauri Sanvariya', party: 'BJP' },
  { wardNo: 47, wardName: 'Daliganj - Niralanagar', name: 'Abhilasha Katiyar', party: 'BJP' },
  { wardNo: 48, wardName: 'Faizullaganj - I', name: 'Rashmi Singh', party: 'BJP' },
  { wardNo: 49, wardName: 'Mahakavi Jai Shankar Prasad', name: 'Swadesh Singh', party: 'BJP' },
  { wardNo: 50, wardName: 'Chinhat - I', name: 'Arun Kumar Rai', party: 'BJP' },
  { wardNo: 51, wardName: 'Ismailganj - I', name: 'Mukesh Singh Chauhan', party: 'INC' },
  { wardNo: 52, wardName: 'Kanhaiya - Madhavpur - I', name: 'Ram Naresh Chaurasiya', party: 'SP' },
  { wardNo: 53, wardName: 'Mahanagar', name: 'Harishchandra Lodhi', party: 'BJP' },
  { wardNo: 54, wardName: 'Geetapalli', name: 'Richa Mishra', party: 'BJP' },
  { wardNo: 55, wardName: 'Rani Laxmi Bai', name: 'Shafikur Rehman', party: 'SP' },
  { wardNo: 56, wardName: 'Vidhya Vati', name: 'Kaushalendra Diwedi', party: 'BJP' },
  { wardNo: 57, wardName: 'Babu Banarsi Das', name: 'Ashish Kumar Hitaishi', party: 'BJP' },
  { wardNo: 58, wardName: 'Moti Lal Nehru - Chandra Bhanu Gupta Nagar', name: 'Charanjit Gandhi', party: 'BJP' },
  { wardNo: 59, wardName: 'Colvin College - Nishatganj', name: 'Pramod Singh', party: 'BJP' },
  { wardNo: 60, wardName: 'Vidhya Vati - III', name: 'Nirmala Singh', party: 'BJP' },
  { wardNo: 61, wardName: 'Tilak Nagar - Kundari Rakabganj', name: 'Rajiv Bajpayee', party: 'BJP' },
  { wardNo: 62, wardName: 'Rafi Ahmed Kidwai', name: 'Malti Yadav', party: 'BJP' },
  { wardNo: 63, wardName: 'Ayodhya Das - II', name: 'Awdhesh Tripathi', party: 'BJP' },
  { wardNo: 64, wardName: 'Vidhya Vati - I', name: 'Pratima Tiwari', party: 'BJP' },
  { wardNo: 65, wardName: 'Chitragupta Nagar', name: 'Narendra Kumar', party: 'BJP' },
  { wardNo: 66, wardName: 'Chinhat - II', name: 'Shailendra Verma', party: 'BJP' },
  { wardNo: 67, wardName: 'Lala Lajpat Rai', name: 'Raghav Ram Tiwari', party: 'BJP' },
  { wardNo: 68, wardName: 'Babu Jagjivan Ram', name: 'Bhrigunath Shukla', party: 'BJP' },
  { wardNo: 69, wardName: 'J.C. Bose', name: 'Yavar Hussain Reshu', party: 'SP' },
  { wardNo: 70, wardName: 'Paper Mill Colony', name: 'Rajesh Singh', party: 'BJP' },
  { wardNo: 71, wardName: 'Mankameshwar Mandir', name: 'Ranjit Singh', party: 'BJP' },
  { wardNo: 72, wardName: 'Shankarpurva - III', name: 'Umesh Chandra Sanval', party: 'BJP' },
  { wardNo: 73, wardName: 'Faizullaganj - III', name: 'Pradeep Kumar Shukla', party: 'BJP' },
  { wardNo: 74, wardName: 'Jankipuram - II', name: 'Rajkumari Maurya', party: 'BJP' },
  { wardNo: 75, wardName: 'Bhartendu Harishchandra', name: 'Man Singh Yadav', party: 'BJP' },
  { wardNo: 76, wardName: 'Rajiv Gandhi - I', name: 'Sanjay Rathore', party: 'BJP' },
  { wardNo: 77, wardName: 'Maithlisharan Gupta', name: 'Ashok Kumar Upadhya', party: 'IND' },
  { wardNo: 78, wardName: 'Labor Colony', name: 'Ajay Dixit', party: 'BJP' },
  { wardNo: 79, wardName: 'Rajajipuram', name: 'Kaumudi Tripathi', party: 'BJP' },
  { wardNo: 80, wardName: 'Indira Nagar', name: 'Puja Jaswani', party: 'BJP' },
  { wardNo: 81, wardName: 'Mallahi Tola - II', name: 'Gulshan Abbas', party: 'SP' },
  { wardNo: 82, wardName: 'Triveni Nagar', name: 'Dev Sharma Mishra', party: 'BJP' },
  { wardNo: 83, wardName: 'New Haiderganj - I', name: 'Rajnii Gupta', party: 'BJP' },
  { wardNo: 84, wardName: 'Kadam Rasool', name: 'Mohd. Nadeem', party: 'SP' },
  { wardNo: 85, wardName: 'Mallahi Tola - I', name: 'CB Singh', party: 'BJP' },
  { wardNo: 86, wardName: 'Lohia Nagar', name: 'Rajesh Mishra', party: 'BJP' },
  { wardNo: 87, wardName: 'Gola Ganj', name: 'Mohd. Haleem', party: 'SP' },
  { wardNo: 88, wardName: 'Bashiratganj - Ganeshganj', name: 'Girish Gupta', party: 'BJP' },
  { wardNo: 89, wardName: 'Sheetla Devi', name: 'Anoop Kamal Saxena', party: 'BJP' },
  { wardNo: 90, wardName: 'Rajendra Nagar', name: 'Rajesh Kumar Dixit', party: 'BJP' },
  { wardNo: 91, wardName: 'Vivekanand Puri', name: 'Nupur Shankghar', party: 'BJP' },
  { wardNo: 92, wardName: 'Shankarpurva - I', name: 'Namita Yadav', party: 'SP' },
  { wardNo: 93, wardName: 'Husainabad', name: 'Lubana Ali', party: 'BJP' },
  { wardNo: 94, wardName: 'Daulatganj', name: 'Rani Kanaujia', party: 'BJP' },
  { wardNo: 95, wardName: 'Maulvi Ganj', name: "Mukesh Singh 'Monti'", party: 'BJP' },
  { wardNo: 96, wardName: 'Lal Bahadur Shashtri - II', name: 'Bhupendra Kumar Sharma', party: 'BJP' },
  { wardNo: 97, wardName: 'Gadhi Pir Khan', name: 'Shaista Parveen', party: 'IND' },
  { wardNo: 98, wardName: 'Yadunath Sanyal - Nazarbagh', name: 'Kaamran Beg', party: 'SP' },
  { wardNo: 99, wardName: 'Acharya Narendra Dev', name: 'Manish Rastogi', party: 'BJP' },
  { wardNo: 100, wardName: 'Rajiv Gandhi - II', name: 'Arun Kumar Tiwari', party: 'BJP' },
  { wardNo: 101, wardName: 'Amberganj', name: 'Saba Ahsan Mansuri', party: 'SP' },
  { wardNo: 102, wardName: 'Maulana Kalbe Abid', name: 'Ifham Ullah', party: 'INC' },
  { wardNo: 103, wardName: 'Mashakganj - Wazirganj', name: 'Mohd. Naeem', party: 'SP' },
  { wardNo: 104, wardName: 'Yahiaganj - Netaji Subhash Chandra Bose', name: 'Narendra Sharma', party: 'BJP' },
  { wardNo: 105, wardName: 'Kashmiri Mohalla', name: 'Laeek Aaga', party: 'SP' },
  { wardNo: 106, wardName: 'Chowk - Bazar Kali Ji', name: "Anurag Mishra 'Annu'", party: 'BJP' },
  { wardNo: 107, wardName: 'Raja - Bazar', name: 'Rahul Mishra', party: 'BJP' },
  { wardNo: 108, wardName: 'Bhawaniganj', name: 'Reeta Rai', party: 'BJP' },
  { wardNo: 109, wardName: 'Aliganj', name: 'Prithvi Gupta', party: 'BJP' },
  { wardNo: 110, wardName: 'Ayodhya Das - I', name: 'Musbbor Ali Manshu', party: 'SP' },
]
