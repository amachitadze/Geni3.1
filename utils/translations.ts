export type Language = 'ka' | 'es';

export const translations = {
    ka: {
        // Menu
        menu_navigation: "ნავიგაცია",
        menu_home: "საწყისი გვერდი",
        menu_message: "გაგზავნე შეტყობინება",
        menu_share: "გაზიარება",
        menu_search: "ძიება",
        menu_search_person: "პიროვნების ძიება",
        menu_search_history: "ისტორიული ძიება (Google)",
        menu_analysis: "ანალიზი",
        menu_stats: "სტატისტიკა",
        menu_export_pdf: "PDF ექსპორტი",
        menu_data: "მონაცემები",
        menu_manage_data: "მონაცემების მართვა",
        menu_import: "იმპორტი",
        menu_export: "ექსპორტი",
        menu_settings: "პარამეტრები",
        menu_theme: "თემის შეცვლა",
        menu_view: "ხედი",
        menu_view_default: "სტანდარტული",
        menu_view_compact: "კომპაქტური",
        menu_view_list: "სია",
        
        // Header
        header_back: "უკან",
        search_placeholder: "მოძებნეთ პიროვნება...",

        // Statistics
        stats_title: "სანათესავოს სტატისტიკა",
        stats_total: "სულ",
        stats_demographics: "დემოგრაფიული ანალიზი",
        stats_gender: "სქესობრივი ბალანსი",
        stats_status: "სტატუსი",
        stats_age_groups: "ასაკობრივი ჯგუფები (ცოცხლები)",
        stats_interesting: "საინტერესო ფაქტები",
        stats_generations: "თაობების ანალიზი",
        stats_people_generations: "ადამიანები თაობებში",
        stats_birth_rate: "შობადობის კოეფიციენტი",
        stats_popular_names: "პოპულარული სახელები",
        stats_top_male: "TOP 5 მამრობითი სახელი",
        stats_top_female: "TOP 5 მდედრობითი სახელი",
        
        // Cards
        card_oldest: "ყველაზე ხანდაზმული (ცოცხალი)",
        card_youngest: "ყველაზე უმცროსი (ცოცხალი)",
        card_lifespan: "სიცოცხლის საშ. ხანგრძლივობა",
        card_lifespan_sub: "(გარდაცვლილების მიხედვით)",
        card_address: "ყველაზე გავრც. მისამართი",
        card_address_sub: "ადამიანი",

        // Actions
        btn_close: "დახურვა",

        // Landing Page
        landing_badge: "ანალოგი არ აქვს",
        landing_title_1: "თქვენი ისტორია,",
        landing_title_2: "უსასრულო",
        landing_title_3: " და დაცული.",
        landing_desc: "შექმენით გენეალოგიური ხე შეზღუდვების გარეშე. სრული კონფიდენციალურობა, დეტალური სტატისტიკა და მარტივი გაზიარება — ყველაფერი ერთ სივრცეში.",
        landing_cta: "დაიწყეთ ახლავე",
        landing_open_tree: "ხის გახსნა",
        landing_features_title: "რატომ არის ჩვენი პლატფორმა უნიკალური?",
        landing_features_desc: "ჩვენ გავაერთიანეთ სიმარტივე და სიმძლავრე, რათა თქვენი ოჯახის ისტორია იყოს დაცული და ადვილად სამართავი.",
        landing_footer_cta_title: "შეინახეთ წარსული მომავლისთვის",
        landing_footer_cta_desc: "თქვენი ოჯახის ისტორია იმსახურებს საუკეთესო ადგილს. დაიწყეთ დღესვე, სრულიად უფასოდ.",
        landing_copyright: "გენეალოგიური ხე. ყველა უფლება დაცულია.",
        landing_created_by: "შექმნილია",
        landing_by: "-ს მიერ",

        // Features
        feat_unlimited_title: "შეზღუდვების გარეშე",
        feat_unlimited_desc: "დაამატეთ უსასრულო რაოდენობის პიროვნება. მშობლები, შვილები, მეუღლეები, დედმამიშვილები — ხე იზრდება თქვენთან ერთად.",
        feat_private_title: "100% კონფიდენციალური",
        feat_private_desc: "თქვენი მონაცემები ინახება მხოლოდ თქვენს მოწყობილობაში. ჩვენ არ გვაქვს წვდომა თქვენს ოჯახურ ისტორიაზე.",
        feat_share_title: "დაცული გაზიარება",
        feat_share_desc: "გაუზიარეთ ხე ნათესავებს სპეციალური, დაშიფრული ბმულით. ინფორმაციის ნახვა მხოლოდ პაროლითაა შესაძლებელი.",
        feat_stats_title: "ჭკვიანი სტატისტიკა",
        feat_stats_desc: "ავტომატური ანალიზი: სიცოცხლის ხანგრძლივობა, თაობების განაწილება, პოპულარული სახელები და გენდერული ბალანსი.",
        feat_import_title: "იმპორტი & ექსპორტი",
        feat_import_desc: "შეინახეთ მონაცემები JSON ფორმატში სარეზერვო ასლისთვის ან გადმოწერეთ ხე მაღალი ხარისხის PDF ფაილად.",
        feat_mobile_title: "მობილურზე მორგებული",
        feat_mobile_desc: "სრულად ადაპტირებული ინტერფეისი. მართეთ თქვენი ხე ნებისმიერი ადგილიდან, ნებისმიერი მოწყობილობით.",

        // Initial View
        initial_title: "კეთილი იყოს თქვენი მობრძანება!",
        initial_desc: "დაიწყეთ თქვენი ოჯახის ისტორიის შექმნა. აირჩიეთ ერთ-ერთი ქვემოთ მოცემული ვარიანტიდან.",
        initial_btn_create: "ხის შექმნის დაწყება",
        initial_btn_import: "მონაცემების იმპორტი"
    },
    es: {
        // Menu
        menu_navigation: "Navegación",
        menu_home: "Página de inicio",
        menu_message: "Enviar mensaje",
        menu_share: "Compartir",
        menu_search: "Búsqueda",
        menu_search_person: "Buscar persona",
        menu_search_history: "Búsqueda histórica (Google)",
        menu_analysis: "Análisis",
        menu_stats: "Estadísticas",
        menu_export_pdf: "Exportar PDF",
        menu_data: "Datos",
        menu_manage_data: "Gestión de datos",
        menu_import: "Importar",
        menu_export: "Exportar",
        menu_settings: "Configuración",
        menu_theme: "Cambiar tema",
        menu_view: "Vista",
        menu_view_default: "Estándar",
        menu_view_compact: "Compacta",
        menu_view_list: "Lista",
        
        // Header
        header_back: "Atrás",
        search_placeholder: "Buscar persona...",

        // Statistics
        stats_title: "Estadísticas familiares",
        stats_total: "Total",
        stats_demographics: "Análisis demográfico",
        stats_gender: "Equilibrio de género",
        stats_status: "Estado",
        stats_age_groups: "Grupos de edad (Vivos)",
        stats_interesting: "Datos interesantes",
        stats_generations: "Análisis generacional",
        stats_people_generations: "Personas por generación",
        stats_birth_rate: "Tasa de natalidad",
        stats_popular_names: "Nombres populares",
        stats_top_male: "TOP 5 Nombres masculinos",
        stats_top_female: "TOP 5 Nombres femeninos",

        // Cards
        card_oldest: "El más viejo (Vivo)",
        card_youngest: "El más joven (Vivo)",
        card_lifespan: "Esperanza de vida media",
        card_lifespan_sub: "(Basado en fallecidos)",
        card_address: "Dirección más común",
        card_address_sub: "personas",

        // Actions
        btn_close: "Cerrar",

        // Landing Page
        landing_badge: "Sin análogos",
        landing_title_1: "Tu historia,",
        landing_title_2: "infinita",
        landing_title_3: " y segura.",
        landing_desc: "Crea tu árbol genealógico sin límites. Privacidad total, estadísticas detalladas y fácil de compartir: todo en un solo lugar.",
        landing_cta: "Empezar ahora",
        landing_open_tree: "Abrir árbol",
        landing_features_title: "¿Por qué es única nuestra plataforma?",
        landing_features_desc: "Hemos combinado simplicidad y potencia para mantener tu historia familiar segura y fácil de gestionar.",
        landing_footer_cta_title: "Guarda el pasado para el futuro",
        landing_footer_cta_desc: "Tu historia familiar merece el mejor lugar. Empieza hoy, es completamente gratis.",
        landing_copyright: "Árbol Genealógico. Todos los derechos reservados.",
        landing_created_by: "Creado por",
        landing_by: "",

        // Features
        feat_unlimited_title: "Sin límites",
        feat_unlimited_desc: "Añade un número infinito de personas. Padres, hijos, cónyuges, hermanos: el árbol crece contigo.",
        feat_private_title: "100% Confidencial",
        feat_private_desc: "Tus datos se almacenan solo en tu dispositivo. No tenemos acceso a tu historia familiar.",
        feat_share_title: "Uso compartido seguro",
        feat_share_desc: "Comparte el árbol con familiares mediante un enlace encriptado especial. La información solo es accesible con contraseña.",
        feat_stats_title: "Estadísticas inteligentes",
        feat_stats_desc: "Análisis automático: esperanza de vida, distribución generacional, nombres populares y equilibrio de género.",
        feat_import_title: "Importar y Exportar",
        feat_import_desc: "Guarda datos en formato JSON para copia de seguridad o descarga el árbol como un archivo PDF de alta calidad.",
        feat_mobile_title: "Adaptado a móviles",
        feat_mobile_desc: "Interfaz totalmente adaptativa. Gestiona tu árbol desde cualquier lugar, con cualquier dispositivo.",

        // Initial View
        initial_title: "¡Bienvenido!",
        initial_desc: "Comienza a construir tu historia familiar. Elige una de las siguientes opciones.",
        initial_btn_create: "Crear árbol",
        initial_btn_import: "Importar datos"
    }
};