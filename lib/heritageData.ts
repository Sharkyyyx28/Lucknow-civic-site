// Authentic Awadh Heritage and Historical Landmarks in Lucknow.
// Hand-verified coordinates, architectural period, and historical context.

export interface HeritageSite {
  id: string
  name: string
  hindiName?: string
  yearBuilt: string
  era: 'Nawabi' | 'Colonial' | 'Pre-Mughal'
  commissionedBy: string
  architectureStyle: string
  lat: number
  lng: number
  summary: string
  highlight: string
}

export const LUCKNOW_HERITAGE_SITES: HeritageSite[] = [
  {
    id: 'bara-imambara',
    name: 'Bara Imambara & Asafi Mosque',
    hindiName: 'बड़ा इमामबाड़ा',
    yearBuilt: '1784',
    era: 'Nawabi',
    commissionedBy: 'Nawab Asaf-ud-Daula',
    architectureStyle: 'Mughal & Awadhi arched vaulted construction',
    lat: 26.8689,
    lng: 80.9130,
    summary:
      'Commissioned as a famine relief project by Nawab Asaf-ud-Daula. Built without iron beams or external pillars, using interlocking brickwork.',
    highlight: 'World-famous central vaulted hall and the upper Bhulbhulaiya labyrinth.',
  },
  {
    id: 'rumi-darwaza',
    name: 'Rumi Darwaza (Turkish Gate)',
    hindiName: 'रूमी दरवाज़ा',
    yearBuilt: '1784',
    era: 'Nawabi',
    commissionedBy: 'Nawab Asaf-ud-Daula',
    architectureStyle: 'Awadhi Baroque, modeled after Bab-i-Humayun (Constantinople)',
    lat: 26.8710,
    lng: 80.9120,
    summary:
      'The monumental 60-foot entrance gateway to Old Lucknow, standing between Bara Imambara and Chhota Imambara.',
    highlight: 'The iconic architectural symbol of Lucknow and Awadh culture.',
  },
  {
    id: 'chhota-imambara',
    name: 'Chhota Imambara (Husainabad Imambara)',
    hindiName: 'छोटा इमामबाड़ा',
    yearBuilt: '1838',
    era: 'Nawabi',
    commissionedBy: 'Nawab Muhammad Ali Shah',
    architectureStyle: 'Indo-Islamic with gilded dome & Belgian glass chandeliers',
    lat: 26.8738,
    lng: 80.9048,
    summary:
      'Known as the "Palace of Lights" due to its dazzling illumination during festivals. Houses the mausoleum of Muhammad Ali Shah and his mother.',
    highlight: 'Calligraphic Arabic ornamentation and Belgian crystal chandeliers.',
  },
  {
    id: 'the-residency',
    name: 'The British Residency',
    hindiName: 'रेज़िडेंसी',
    yearBuilt: '1780–1800',
    era: 'Colonial',
    commissionedBy: 'Nawab Asaf-ud-Daula & Saadat Ali Khan II',
    architectureStyle: 'European Georgian & Regency colonial brickwork',
    lat: 26.8618,
    lng: 80.9257,
    summary:
      'Residential complex for the British Resident. Scene of the prolonged 87-day Siege of Lucknow during the 1857 First War of Independence.',
    highlight: 'Main building cannon-scarred ruins preserved in original memorial state.',
  },
  {
    id: 'clock-tower',
    name: 'Husainabad Clock Tower & Picture Gallery',
    hindiName: 'हुसैनाबाद घंटाघर',
    yearBuilt: '1881',
    era: 'Colonial',
    commissionedBy: 'Husainabad Trust (designed by Richard Roskell Bayne)',
    architectureStyle: 'Victorian-Gothic tower with 12-petalled flower clockwork',
    lat: 26.8717,
    lng: 80.9083,
    summary:
      'At 221 feet (67 m), it is the tallest clock tower in India, erected to mark the arrival of Sir George Couper in the United Provinces.',
    highlight: 'Tallest clock tower in India, adjacent to the Baradari and Picture Gallery.',
  },
  {
    id: 'chattar-manzil',
    name: 'Chattar Manzil (Umbrella Palace)',
    hindiName: 'छतर मंज़िल',
    yearBuilt: '1781–1803',
    era: 'Nawabi',
    commissionedBy: 'Nawab Ghazi-ud-Din Haider & Nasir-ud-Din Haider',
    architectureStyle: 'Indo-Italianate baroque with gilded parasol dome',
    lat: 26.8573,
    lng: 80.9328,
    summary:
      'Royal palace on the banks of the Gomti river with extensive subterranean chambers (taikhanas) cooled by the river water.',
    highlight: 'Gilded umbrella (chhatri) crowning the dome.',
  },
  {
    id: 'la-martiniere',
    name: 'Constantia (La Martiniere College)',
    hindiName: 'ला मार्टिनियर',
    yearBuilt: '1795–1800',
    era: 'Colonial',
    commissionedBy: 'Major General Claude Martin',
    architectureStyle: 'Eclectic fusion of Palladian, European Gothic & Mughal bastion architecture',
    lat: 26.8375,
    lng: 80.9632,
    summary:
      'Country estate and tomb of French adventurer Major General Claude Martin. Defended during 1857 and holds royal battle honours.',
    highlight: 'Monumental central fluted column ("Lat") rising from the lake.',
  },
  {
    id: 'dilkusha-kothi',
    name: 'Dilkusha Kothi & Hunting Lodge',
    hindiName: 'दिलकुशा कोठी',
    yearBuilt: '1800',
    era: 'Nawabi',
    commissionedBy: 'Nawab Saadat Ali Khan II (designed by Gore Ouseley)',
    architectureStyle: 'English Baroque country palace with round towers',
    lat: 26.8290,
    lng: 80.9692,
    summary:
      'Patterned after Seaton Delaval Hall in Northumberland. Served as a countryside hunting retreat and summer villa surrounded by parkland.',
    highlight: 'Towers and open-air grand verandas overlooking Dilkusha gardens.',
  },
  {
    id: 'kaiserbagh-palace',
    name: 'Qaiserbagh Palace & Safed Baradari',
    hindiName: 'क़ैसरबाग़ एवं सफ़ेद बारादरी',
    yearBuilt: '1848–1850',
    era: 'Nawabi',
    commissionedBy: 'Nawab Wajid Ali Shah',
    architectureStyle: 'Awadhi-Moorish palace complex with white marble pavilion',
    lat: 26.8568,
    lng: 80.9275,
    summary:
      'Vast palace complex envisioned as a paradise on earth by Wajid Ali Shah. The Safed Baradari (White Palace) served as a royal court and theater for kathak and musical performances.',
    highlight: 'Safed Baradari white marble court of Nawab Wajid Ali Shah.',
  },
  {
    id: 'sikandar-bagh',
    name: 'Sikandar Bagh',
    hindiName: 'सिकंदर बाग़',
    yearBuilt: '1855',
    era: 'Nawabi',
    commissionedBy: 'Nawab Wajid Ali Shah',
    architectureStyle: 'Walled pleasure garden with decorative European-Mughal pavilion',
    lat: 26.8532,
    lng: 80.9575,
    summary:
      'Named after Wajid Ali Shah\'s favorite queen Sikandar Mahal. Site of fierce fighting during the November 1857 second relief of Lucknow by Colin Campbell.',
    highlight: 'Historic gate and battle memorial at the National Botanical Research Institute (NBRI).',
  },
  {
    id: 'satkhanda',
    name: 'Satkhanda (Seven-Story Watchtower)',
    hindiName: 'सतखंडा',
    yearBuilt: '1837–1842',
    era: 'Nawabi',
    commissionedBy: 'Nawab Muhammad Ali Shah',
    architectureStyle: 'Greco-Roman and Awadhi octagonal multi-tiered tower',
    lat: 26.8722,
    lng: 80.9070,
    summary:
      'Designed as a lunar observatory and watchtower. Construction halted at four stories upon the death of Nawab Muhammad Ali Shah in 1842.',
    highlight: 'Triple-arched Italianate windows with crescent moon motifs.',
  },
]
