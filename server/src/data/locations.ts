// GeoAslan - Konum Havuzları
// Her harita için Street View desteği olan koordinatlar

export interface GameMap {
    id: string;
    name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    region: string;
    emoji: string;
    locations: { lat: number; lng: number }[];
}

// Dünya genelinden konumlar - Google Street View'da coverage olan yerler
const WORLD_LOCATIONS: { lat: number; lng: number }[] = [
    // Avrupa
    { lat: 48.8566, lng: 2.3522 },     // Paris
    { lat: 51.5074, lng: -0.1278 },    // Londra
    { lat: 52.5200, lng: 13.4050 },    // Berlin
    { lat: 41.9028, lng: 12.4964 },    // Roma
    { lat: 40.4168, lng: -3.7038 },    // Madrid
    { lat: 59.3293, lng: 18.0686 },    // Stockholm
    { lat: 55.6761, lng: 12.5683 },    // Kopenhag
    { lat: 60.1699, lng: 24.9384 },    // Helsinki
    { lat: 52.3676, lng: 4.9041 },     // Amsterdam
    { lat: 50.8503, lng: 4.3517 },     // Brüksel
    { lat: 48.2082, lng: 16.3738 },    // Viyana
    { lat: 47.3769, lng: 8.5417 },     // Zürih
    { lat: 38.7223, lng: -9.1393 },    // Lizbon
    { lat: 37.9838, lng: 23.7275 },    // Atina
    { lat: 44.4268, lng: 26.1025 },    // Bükreş
    { lat: 50.0755, lng: 14.4378 },    // Prag
    { lat: 47.4979, lng: 19.0402 },    // Budapeşte
    { lat: 52.2297, lng: 21.0122 },    // Varşova
    { lat: 59.9139, lng: 10.7522 },    // Oslo
    { lat: 64.1466, lng: -21.9426 },   // Reykjavik
    { lat: 53.3498, lng: -6.2603 },    // Dublin
    { lat: 55.9533, lng: -3.1883 },    // Edinburgh
    { lat: 45.4642, lng: 9.1900 },     // Milano
    { lat: 43.7696, lng: 11.2558 },    // Floransa
    { lat: 41.3851, lng: 2.1734 },     // Barselona
    { lat: 43.2965, lng: 5.3698 },     // Marsilya
    { lat: 45.7640, lng: 4.8357 },     // Lyon
    { lat: 53.5511, lng: 9.9937 },     // Hamburg
    { lat: 48.1351, lng: 11.5820 },    // Münih
    { lat: 46.2044, lng: 6.1432 },     // Cenevre

    // Kuzey Amerika
    { lat: 40.7128, lng: -74.0060 },   // New York
    { lat: 34.0522, lng: -118.2437 },  // Los Angeles
    { lat: 41.8781, lng: -87.6298 },   // Chicago
    { lat: 29.7604, lng: -95.3698 },   // Houston
    { lat: 33.4484, lng: -112.0740 },  // Phoenix
    { lat: 37.7749, lng: -122.4194 },  // San Francisco
    { lat: 47.6062, lng: -122.3321 },  // Seattle
    { lat: 25.7617, lng: -80.1918 },   // Miami
    { lat: 42.3601, lng: -71.0589 },   // Boston
    { lat: 39.7392, lng: -104.9903 },  // Denver
    { lat: 36.1627, lng: -86.7816 },   // Nashville
    { lat: 35.2271, lng: -80.8431 },   // Charlotte
    { lat: 32.7767, lng: -96.7970 },   // Dallas
    { lat: 30.2672, lng: -97.7431 },   // Austin
    { lat: 45.5017, lng: -73.5673 },   // Montreal
    { lat: 43.6532, lng: -79.3832 },   // Toronto
    { lat: 49.2827, lng: -123.1207 },  // Vancouver
    { lat: 51.0447, lng: -114.0719 },  // Calgary
    { lat: 19.4326, lng: -99.1332 },   // Mexico City
    { lat: 20.6597, lng: -103.3496 },  // Guadalajara

    // Güney Amerika
    { lat: -23.5505, lng: -46.6333 },  // São Paulo
    { lat: -22.9068, lng: -43.1729 },  // Rio de Janeiro
    { lat: -34.6037, lng: -58.3816 },  // Buenos Aires
    { lat: -33.4489, lng: -70.6693 },  // Santiago
    { lat: -12.0464, lng: -77.0428 },  // Lima
    { lat: 4.7110, lng: -74.0721 },    // Bogota
    { lat: -0.1807, lng: -78.4678 },   // Quito
    { lat: -15.7975, lng: -47.8919 },  // Brasilia
    { lat: -3.1190, lng: -60.0217 },   // Manaus
    { lat: -34.9011, lng: -56.1645 },  // Montevideo

    // Asya
    { lat: 35.6762, lng: 139.6503 },   // Tokyo
    { lat: 37.5665, lng: 126.9780 },   // Seul
    { lat: 1.3521, lng: 103.8198 },    // Singapur
    { lat: 13.7563, lng: 100.5018 },   // Bangkok
    { lat: 14.5995, lng: 120.9842 },   // Manila
    { lat: 21.0278, lng: 105.8342 },   // Hanoi
    { lat: 22.3193, lng: 114.1694 },   // Hong Kong
    { lat: 25.0330, lng: 121.5654 },   // Taipei
    { lat: 28.6139, lng: 77.2090 },    // Yeni Delhi
    { lat: 19.0760, lng: 72.8777 },    // Mumbai
    { lat: 34.6937, lng: 135.5023 },   // Osaka
    { lat: 35.0116, lng: 135.7681 },   // Kyoto
    { lat: 31.2304, lng: 121.4737 },   // Şanghay
    { lat: 39.9042, lng: 116.4074 },   // Pekin
    { lat: 3.1390, lng: 101.6869 },    // Kuala Lumpur
    { lat: -6.2088, lng: 106.8456 },   // Cakarta
    { lat: 33.8938, lng: 35.5018 },    // Beyrut
    { lat: 25.2048, lng: 55.2708 },    // Dubai
    { lat: 41.0082, lng: 28.9784 },    // İstanbul (Avrupa yakası)
    { lat: 24.7136, lng: 46.6753 },    // Riyad

    // Okyanusya
    { lat: -33.8688, lng: 151.2093 },  // Sidney
    { lat: -37.8136, lng: 144.9631 },  // Melbourne
    { lat: -27.4698, lng: 153.0251 },  // Brisbane
    { lat: -36.8485, lng: 174.7633 },  // Auckland
    { lat: -41.2865, lng: 174.7762 },  // Wellington
    { lat: -31.9505, lng: 115.8605 },  // Perth

    // Afrika
    { lat: -33.9249, lng: 18.4241 },   // Cape Town
    { lat: -26.2041, lng: 28.0473 },   // Johannesburg
    { lat: 30.0444, lng: 31.2357 },    // Kahire
    { lat: 33.5731, lng: -7.5898 },    // Kazablanka
    { lat: -1.2921, lng: 36.8219 },    // Nairobi
    { lat: 6.5244, lng: 3.3792 },      // Lagos
    { lat: 14.7167, lng: -17.4677 },   // Dakar
    { lat: 36.8065, lng: 10.1815 },    // Tunus

    // Ek dünya konumları - daha az bilinen yerler
    { lat: 35.1796, lng: 33.3823 },    // Lefkoşa
    { lat: 42.6977, lng: 23.3219 },    // Sofya
    { lat: 43.8563, lng: 18.4131 },    // Saraybosna
    { lat: 44.7866, lng: 20.4489 },    // Belgrad
    { lat: 42.4304, lng: 19.2594 },    // Podgorica
    { lat: 41.3275, lng: 19.8187 },    // Tiran
    { lat: 41.9981, lng: 21.4254 },    // Üsküp
    { lat: 45.8150, lng: 15.9819 },    // Zagreb
    { lat: 46.0569, lng: 14.5058 },    // Ljubljana
    { lat: 56.9496, lng: 24.1052 },    // Riga
    { lat: 54.6872, lng: 25.2797 },    // Vilnius
    { lat: 59.4370, lng: 24.7536 },    // Tallinn
    { lat: 57.7089, lng: 11.9746 },    // Göteborg
    { lat: 63.8258, lng: 20.2630 },    // Umeå
    { lat: 69.6492, lng: 18.9553 },    // Tromsø
    { lat: 62.0000, lng: 6.7833 },     // Faroe Adaları
    { lat: 35.8989, lng: 14.5146 },    // Malta
    { lat: 43.7384, lng: 7.4246 },     // Monako
    { lat: 42.5063, lng: 1.5218 },     // Andorra
    { lat: 49.6117, lng: 6.1300 },     // Lüksemburg

    // Güneydoğu Asya ek
    { lat: 11.5564, lng: 104.9282 },   // Phnom Penh
    { lat: 17.9757, lng: 102.6331 },   // Vientiane
    { lat: 16.8661, lng: 96.1951 },    // Yangon
    { lat: 10.8231, lng: 106.6297 },   // Ho Chi Minh
    { lat: 7.8804, lng: 98.3923 },     // Phuket

    // Orta Amerika
    { lat: 9.9281, lng: -84.0907 },    // San Jose (Kosta Rika)
    { lat: 8.9824, lng: -79.5199 },    // Panama City
    { lat: 14.6349, lng: -90.5069 },   // Guatemala City
    { lat: 12.1150, lng: -86.2362 },   // Managua
    { lat: 23.1136, lng: -82.3666 },   // Havana

    // Ek Avrupa
    { lat: 48.8534, lng: 2.3488 },     // Paris - Marais
    { lat: 51.5128, lng: -0.0918 },    // Londra - Tower Bridge
    { lat: 41.4025, lng: 2.1743 },     // Barselona - Sagrada Familia
    { lat: 45.4408, lng: 12.3155 },    // Venedik
    { lat: 43.7102, lng: 10.3959 },    // Pisa
    { lat: 40.8518, lng: 14.2681 },    // Napoli
    { lat: 37.1765, lng: -3.5983 },    // Granada
    { lat: 39.4699, lng: -0.3763 },    // Valensiya
    { lat: 51.0504, lng: 13.7373 },    // Dresden
    { lat: 50.9375, lng: 6.9603 },     // Köln

    // Japonya ek
    { lat: 43.0618, lng: 141.3545 },   // Sapporo
    { lat: 34.3853, lng: 132.4553 },   // Hiroshima
    { lat: 33.5904, lng: 130.4017 },   // Fukuoka
    { lat: 26.3344, lng: 127.8056 },   // Okinawa

    // Avustralya ek
    { lat: -34.9285, lng: 138.6007 },  // Adelaide
    { lat: -12.4634, lng: 130.8456 },  // Darwin
    { lat: -42.8821, lng: 147.3272 },  // Hobart
    { lat: -16.9186, lng: 145.7781 },  // Cairns
];

// Türkiye konumları
const TURKEY_LOCATIONS: { lat: number; lng: number }[] = [
    // Büyükşehirler
    { lat: 41.0082, lng: 28.9784 },    // İstanbul - Sultanahmet
    { lat: 41.0422, lng: 29.0083 },    // İstanbul - Kadıköy
    { lat: 41.0766, lng: 29.0527 },    // İstanbul - Üsküdar
    { lat: 41.0136, lng: 28.9550 },    // İstanbul - Beyoğlu
    { lat: 39.9334, lng: 32.8597 },    // Ankara - Kızılay
    { lat: 39.9415, lng: 32.8537 },    // Ankara - Ulus
    { lat: 38.4192, lng: 27.1287 },    // İzmir - Konak
    { lat: 38.4625, lng: 27.2159 },    // İzmir - Bornova
    { lat: 37.0000, lng: 35.3213 },    // Adana
    { lat: 40.1885, lng: 29.0610 },    // Bursa
    { lat: 36.8969, lng: 30.7133 },    // Antalya
    { lat: 41.2867, lng: 36.3300 },    // Samsun
    { lat: 38.7312, lng: 35.4787 },    // Kayseri
    { lat: 37.7648, lng: 30.2900 },    // Burdur
    { lat: 39.7667, lng: 30.5256 },    // Eskişehir
    { lat: 37.8746, lng: 32.4932 },    // Konya
    { lat: 40.6567, lng: 29.2850 },    // Yalova
    { lat: 40.7667, lng: 30.3933 },    // Sakarya
    { lat: 40.7539, lng: 30.0050 },    // Kocaeli

    // Turistik bölgeler
    { lat: 38.6431, lng: 34.8290 },    // Kapadokya (Göreme)
    { lat: 37.9204, lng: 29.1211 },    // Pamukkale
    { lat: 39.9577, lng: 26.2383 },    // Çanakkale
    { lat: 37.9386, lng: 27.3416 },    // Efes
    { lat: 36.5513, lng: 29.1120 },    // Fethiye
    { lat: 36.8440, lng: 28.8474 },    // Dalaman
    { lat: 37.0380, lng: 27.4241 },    // Bodrum
    { lat: 36.7500, lng: 29.0875 },    // Ölüdeniz
    { lat: 36.4340, lng: 28.2241 },    // Rodos yakını (Marmaris)
    { lat: 36.2000, lng: 29.6389 },    // Kaş
    { lat: 36.5450, lng: 32.0000 },    // Alanya
    { lat: 36.7700, lng: 30.6500 },    // Antalya Konyaaltı
    { lat: 36.8800, lng: 31.3900 },    // Side

    // Karadeniz
    { lat: 41.0027, lng: 39.7168 },    // Trabzon
    { lat: 40.9180, lng: 40.2750 },    // Rize
    { lat: 41.1870, lng: 41.8172 },    // Artvin
    { lat: 40.6607, lng: 40.3120 },    // Çamlıhemşin
    { lat: 40.9167, lng: 38.3833 },    // Giresun
    { lat: 41.3167, lng: 31.4167 },    // Bartın
    { lat: 41.7464, lng: 32.6268 },    // Sinop
    { lat: 41.6818, lng: 32.3380 },    // Kastamonu

    // Doğu
    { lat: 39.6547, lng: 43.4861 },    // Iğdır
    { lat: 39.9220, lng: 43.0530 },    // Kars
    { lat: 40.5111, lng: 43.6200 },    // Ani Harabeleri
    { lat: 39.7191, lng: 44.0082 },    // Ağrı
    { lat: 38.6748, lng: 39.2225 },    // Elazığ
    { lat: 37.9150, lng: 40.2300 },    // Diyarbakır
    { lat: 37.7510, lng: 38.2769 },    // Şanlıurfa
    { lat: 37.0513, lng: 37.3806 },    // Gaziantep
    { lat: 38.3502, lng: 38.3094 },    // Malatya
    { lat: 39.9058, lng: 41.2651 },    // Erzurum

    // İç Anadolu
    { lat: 40.5500, lng: 34.9500 },    // Amasya
    { lat: 40.3167, lng: 36.5500 },    // Tokat
    { lat: 39.6349, lng: 27.8826 },    // Balıkesir
    { lat: 38.3349, lng: 43.3649 },    // Van
    { lat: 39.7477, lng: 37.0150 },    // Sivas

    // Ege ve Akdeniz sahil ek
    { lat: 38.9637, lng: 26.7269 },    // Ayvalık
    { lat: 38.3953, lng: 26.1518 },    // Çeşme
    { lat: 37.7590, lng: 26.9790 },    // Kuşadası
    { lat: 36.2082, lng: 36.1607 },    // Hatay
    { lat: 36.7960, lng: 34.6415 },    // Mersin
    { lat: 39.1478, lng: 34.1694 },    // Kırşehir
    { lat: 40.4247, lng: 30.0300 },    // Bolu
    { lat: 40.6013, lng: 33.6134 },    // Çankırı
    { lat: 38.0168, lng: 32.5136 },    // Beyşehir
    { lat: 37.5847, lng: 36.9227 },    // Kahramanmaraş
];

// Avrupa konumları
const EUROPE_LOCATIONS: { lat: number; lng: number }[] = [
    // Fransa
    { lat: 48.8566, lng: 2.3522 },     // Paris
    { lat: 43.2965, lng: 5.3698 },     // Marsilya
    { lat: 45.7640, lng: 4.8357 },     // Lyon
    { lat: 43.6107, lng: 3.8757 },     // Montpellier
    { lat: 44.8378, lng: -0.5792 },    // Bordeaux
    { lat: 47.2184, lng: -1.5536 },    // Nantes
    { lat: 43.7102, lng: 7.2620 },     // Nice
    { lat: 48.5734, lng: 7.7521 },     // Strasbourg
    { lat: 49.2583, lng: 4.0317 },     // Reims
    { lat: 47.3220, lng: 5.0415 },     // Dijon

    // Almanya
    { lat: 52.5200, lng: 13.4050 },    // Berlin
    { lat: 48.1351, lng: 11.5820 },    // Münih
    { lat: 53.5511, lng: 9.9937 },     // Hamburg
    { lat: 50.9375, lng: 6.9603 },     // Köln
    { lat: 50.1109, lng: 8.6821 },     // Frankfurt
    { lat: 48.7758, lng: 9.1829 },     // Stuttgart
    { lat: 51.2277, lng: 6.7735 },     // Düsseldorf
    { lat: 51.0504, lng: 13.7373 },    // Dresden
    { lat: 49.4521, lng: 11.0767 },    // Nürnberg
    { lat: 54.3233, lng: 10.1394 },    // Kiel

    // İtalya
    { lat: 41.9028, lng: 12.4964 },    // Roma
    { lat: 45.4642, lng: 9.1900 },     // Milano
    { lat: 43.7696, lng: 11.2558 },    // Floransa
    { lat: 45.4408, lng: 12.3155 },    // Venedik
    { lat: 40.8518, lng: 14.2681 },    // Napoli
    { lat: 44.4949, lng: 11.3426 },    // Bolonya
    { lat: 45.0703, lng: 7.6869 },     // Torino
    { lat: 43.7228, lng: 10.4017 },    // Pisa
    { lat: 40.3516, lng: 18.1718 },    // Lecce
    { lat: 38.1157, lng: 13.3615 },    // Palermo

    // İspanya
    { lat: 40.4168, lng: -3.7038 },    // Madrid
    { lat: 41.3851, lng: 2.1734 },     // Barselona
    { lat: 37.3891, lng: -5.9845 },    // Sevilla
    { lat: 39.4699, lng: -0.3763 },    // Valensiya
    { lat: 36.7213, lng: -4.4217 },    // Malaga
    { lat: 37.1765, lng: -3.5983 },    // Granada
    { lat: 43.2627, lng: -2.9253 },    // Bilbao
    { lat: 42.8782, lng: -8.5448 },    // Santiago de Compostela
    { lat: 28.1235, lng: -15.4363 },   // Las Palmas
    { lat: 39.5696, lng: 2.6502 },     // Palma de Mallorca

    // Birleşik Krallık
    { lat: 51.5074, lng: -0.1278 },    // Londra
    { lat: 53.4808, lng: -2.2426 },    // Manchester
    { lat: 55.9533, lng: -3.1883 },    // Edinburgh
    { lat: 53.8008, lng: -1.5491 },    // Leeds
    { lat: 51.4545, lng: -2.5879 },    // Bristol
    { lat: 52.4862, lng: -1.8904 },    // Birmingham
    { lat: 54.9783, lng: -1.6178 },    // Newcastle
    { lat: 53.4084, lng: -2.9916 },    // Liverpool
    { lat: 51.4816, lng: -3.1791 },    // Cardiff
    { lat: 54.5973, lng: -5.9301 },    // Belfast

    // Portekiz
    { lat: 38.7223, lng: -9.1393 },    // Lizbon
    { lat: 41.1579, lng: -8.6291 },    // Porto
    { lat: 37.0194, lng: -7.9322 },    // Faro
    { lat: 40.2033, lng: -8.4103 },    // Coimbra
    { lat: 38.5243, lng: -8.8926 },    // Setúbal

    // İskandinav
    { lat: 59.3293, lng: 18.0686 },    // Stockholm
    { lat: 55.6761, lng: 12.5683 },    // Kopenhag
    { lat: 59.9139, lng: 10.7522 },    // Oslo
    { lat: 60.1699, lng: 24.9384 },    // Helsinki
    { lat: 57.7089, lng: 11.9746 },    // Göteborg
    { lat: 56.1572, lng: 10.2107 },    // Aarhus
    { lat: 63.4305, lng: 10.3951 },    // Trondheim
    { lat: 60.3913, lng: 5.3221 },     // Bergen
    { lat: 61.4978, lng: 23.7610 },    // Tampere
    { lat: 60.4518, lng: 22.2666 },    // Turku

    // Hollanda
    { lat: 52.3676, lng: 4.9041 },     // Amsterdam
    { lat: 51.9225, lng: 4.4792 },     // Rotterdam
    { lat: 52.0907, lng: 5.1214 },     // Utrecht
    { lat: 52.1601, lng: 4.4970 },     // Lahey

    // Belçika
    { lat: 50.8503, lng: 4.3517 },     // Brüksel
    { lat: 51.2194, lng: 4.4025 },     // Antwerp
    { lat: 51.0543, lng: 3.7174 },     // Gent
    { lat: 51.2093, lng: 3.2247 },     // Brugge

    // Avusturya - İsviçre
    { lat: 48.2082, lng: 16.3738 },    // Viyana
    { lat: 47.2692, lng: 11.4041 },    // Innsbruck
    { lat: 47.8095, lng: 13.0550 },    // Salzburg
    { lat: 47.3769, lng: 8.5417 },     // Zürih
    { lat: 46.9481, lng: 7.4474 },     // Bern
    { lat: 46.2044, lng: 6.1432 },     // Cenevre
    { lat: 47.5596, lng: 7.5886 },     // Basel

    // Doğu Avrupa
    { lat: 50.0755, lng: 14.4378 },    // Prag
    { lat: 47.4979, lng: 19.0402 },    // Budapeşte
    { lat: 52.2297, lng: 21.0122 },    // Varşova
    { lat: 44.4268, lng: 26.1025 },    // Bükreş
    { lat: 42.6977, lng: 23.3219 },    // Sofya
    { lat: 44.7866, lng: 20.4489 },    // Belgrad
    { lat: 45.8150, lng: 15.9819 },    // Zagreb
    { lat: 46.0569, lng: 14.5058 },    // Ljubljana
    { lat: 43.8563, lng: 18.4131 },    // Saraybosna
    { lat: 37.9838, lng: 23.7275 },    // Atina
];

// ABD konumları
const USA_LOCATIONS: { lat: number; lng: number }[] = [
    // Doğu Kıyısı
    { lat: 40.7128, lng: -74.0060 },   // New York
    { lat: 40.7580, lng: -73.9855 },   // Times Square
    { lat: 40.6892, lng: -74.0445 },   // Statue of Liberty
    { lat: 38.8977, lng: -77.0365 },   // Washington DC - Beyaz Saray
    { lat: 38.9072, lng: -77.0369 },   // Washington DC
    { lat: 42.3601, lng: -71.0589 },   // Boston
    { lat: 39.9526, lng: -75.1652 },   // Philadelphia
    { lat: 39.2904, lng: -76.6122 },   // Baltimore
    { lat: 25.7617, lng: -80.1918 },   // Miami
    { lat: 28.5383, lng: -81.3792 },   // Orlando
    { lat: 27.9506, lng: -82.4572 },   // Tampa
    { lat: 30.3322, lng: -81.6557 },   // Jacksonville
    { lat: 32.7765, lng: -79.9311 },   // Charleston
    { lat: 35.7796, lng: -78.6382 },   // Raleigh
    { lat: 36.8529, lng: -75.9780 },   // Virginia Beach
    { lat: 41.7658, lng: -72.6734 },   // Hartford
    { lat: 41.8240, lng: -71.4128 },   // Providence

    // Orta - Batı
    { lat: 41.8781, lng: -87.6298 },   // Chicago
    { lat: 42.3314, lng: -83.0458 },   // Detroit
    { lat: 44.9778, lng: -93.2650 },   // Minneapolis
    { lat: 39.0997, lng: -94.5786 },   // Kansas City
    { lat: 38.6270, lng: -90.1994 },   // St. Louis
    { lat: 39.7684, lng: -86.1581 },   // Indianapolis
    { lat: 41.4993, lng: -81.6944 },   // Cleveland
    { lat: 39.9612, lng: -82.9988 },   // Columbus
    { lat: 43.0389, lng: -87.9065 },   // Milwaukee
    { lat: 40.4406, lng: -79.9959 },   // Pittsburgh

    // Güney
    { lat: 29.7604, lng: -95.3698 },   // Houston
    { lat: 32.7767, lng: -96.7970 },   // Dallas
    { lat: 30.2672, lng: -97.7431 },   // Austin
    { lat: 29.4241, lng: -98.4936 },   // San Antonio
    { lat: 29.9511, lng: -90.0715 },   // New Orleans
    { lat: 36.1627, lng: -86.7816 },   // Nashville
    { lat: 35.1495, lng: -90.0490 },   // Memphis
    { lat: 33.7490, lng: -84.3880 },   // Atlanta
    { lat: 35.2271, lng: -80.8431 },   // Charlotte
    { lat: 32.7357, lng: -97.1081 },   // Fort Worth

    // Batı Kıyısı
    { lat: 34.0522, lng: -118.2437 },  // Los Angeles
    { lat: 37.7749, lng: -122.4194 },  // San Francisco
    { lat: 47.6062, lng: -122.3321 },  // Seattle
    { lat: 45.5152, lng: -122.6784 },  // Portland
    { lat: 32.7157, lng: -117.1611 },  // San Diego
    { lat: 36.1699, lng: -115.1398 },  // Las Vegas
    { lat: 33.4484, lng: -112.0740 },  // Phoenix
    { lat: 39.7392, lng: -104.9903 },  // Denver
    { lat: 40.7608, lng: -111.8910 },  // Salt Lake City
    { lat: 35.4676, lng: -97.5164 },   // Oklahoma City
    { lat: 33.4255, lng: -111.9400 },  // Scottsdale
    { lat: 36.7783, lng: -119.4179 },  // Fresno
    { lat: 38.5816, lng: -121.4944 },  // Sacramento

    // Hawaii & Alaska
    { lat: 21.3069, lng: -157.8583 },  // Honolulu
    { lat: 61.2181, lng: -149.9003 },  // Anchorage

    // Ek ABD
    { lat: 36.1147, lng: -115.1728 },  // Las Vegas Strip
    { lat: 34.1478, lng: -118.1445 },  // Pasadena
    { lat: 33.9425, lng: -118.4081 },  // Marina del Rey
    { lat: 37.3382, lng: -121.8863 },  // San Jose
    { lat: 37.5485, lng: -121.9886 },  // Fremont
    { lat: 37.8716, lng: -122.2727 },  // Berkeley
    { lat: 47.6588, lng: -117.4260 },  // Spokane
    { lat: 43.6150, lng: -116.2023 },  // Boise
    { lat: 35.0844, lng: -106.6504 },  // Albuquerque
    { lat: 32.2226, lng: -110.9747 },  // Tucson
];

// Harita tanımları
export const GAME_MAPS: GameMap[] = [
    {
        id: 'world',
        name: 'Dünya',
        description: 'Dünya genelinden rastgele konumlar. Her kıtadan çeşitli şehirler ve bölgeler.',
        difficulty: 'hard',
        region: 'Dünya',
        emoji: '🌍',
        locations: WORLD_LOCATIONS,
    },
    {
        id: 'turkey',
        name: 'Türkiye',
        description: 'Türkiye\'nin dört bir yanından şehirler, turistik bölgeler ve doğal güzellikler.',
        difficulty: 'medium',
        region: 'Türkiye',
        emoji: '🇹🇷',
        locations: TURKEY_LOCATIONS,
    },
    {
        id: 'europe',
        name: 'Avrupa',
        description: 'Avrupa\'nın en güzel şehirleri ve tarihi bölgeleri.',
        difficulty: 'medium',
        region: 'Avrupa',
        emoji: '🇪🇺',
        locations: EUROPE_LOCATIONS,
    },
    {
        id: 'usa',
        name: 'ABD',
        description: 'Amerika Birleşik Devletleri\'nin kıyıdan kıyıya en önemli şehirleri.',
        difficulty: 'medium',
        region: 'ABD',
        emoji: '🇺🇸',
        locations: USA_LOCATIONS,
    },
];

/**
 * Belirli bir haritadan rastgele n konum seç
 */
export function getRandomLocations(mapId: string, count: number): { lat: number; lng: number }[] {
    const map = GAME_MAPS.find(m => m.id === mapId);
    if (!map) throw new Error(`Harita bulunamadı: ${mapId}`);

    const shuffled = [...map.locations].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Harita listesini döndür (konumlar hariç)
 */
export function getMapList(): Omit<GameMap, 'locations'>[] {
    return GAME_MAPS.map(({ locations, ...rest }) => ({
        ...rest,
        locationCount: locations.length,
    })) as any;
}

/**
 * Belirli bir haritayı döndür (konumlar hariç)
 */
export function getMapById(id: string): (Omit<GameMap, 'locations'> & { locationCount: number }) | null {
    const map = GAME_MAPS.find(m => m.id === id);
    if (!map) return null;
    const { locations, ...rest } = map;
    return { ...rest, locationCount: locations.length };
}
