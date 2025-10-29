// --- DEBOUNCER ---
let debounceTimer;

function debounceTextInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        text_input(); 
    }, 300); 
}
// --- ENDE DEBOUNCER ---


function clear_textarea(){
    document.getElementById('impressum_text').value = "";
    text_input(); // Ruft die Funktion mit leerem String auf, cleart alle Felder
};

// Globale Variablen für die vCard (einfacher für den Anfang)
var vorname, nachname, job_title, firma, vorname_nachname, strasse, 
    postleitzahl, ort, telefon, telefon_mobil, fax, email, www, 
    ustid, stnr, registergericht, registernummer;


function text_input() { 
    var text = document.getElementById("impressum_text").value;

// Eingabe Aufbereitung des Strings
    text = text.trim(); 
    text = text.replace(/[^\S\r\n]+$/gm, "")

    // --- ALLES ZURÜCKSETZEN ---
    vorname = ""; nachname = ""; job_title = ""; firma = ""; 
    vorname_nachname = ""; strasse = ""; postleitzahl = ""; ort = "";
    telefon = ""; telefon_mobil = ""; fax = ""; email = ""; www = ""; 
    ustid = ""; stnr = ""; registergericht = ""; registernummer = "";
    
    var p_tags = document.querySelectorAll("body > p");
    p_tags.forEach(p => {
        if (p.id && p.id !== 'vcard') { 
            p.innerHTML = ''; 
        }
    });


// ========================================================================
// START: DIE INTELLIGENTE WEICHE
// ========================================================================
    
    // Prüft, ob typische "Labeled Data"-Keywords vorkommen
    var re_check_labeled = /(Vorname:|Nachname:|Plz\/Ort:|Email:)/gi;

    if (re_check_labeled.test(text)) {
        
        // --- MODUS 1: LABELED DATA (Logik aus script_labeled_data.js) ---
        // Wir füllen die globalen Variablen direkt.
        
        // Helper-Funktion, um Codeduplizierung zu vermeiden
        function findLabeledValue(re) {
            try {
                return re.exec(text)[2].trim();
            } catch (e) {
                return "";
            }
        }

        vorname = findLabeledValue(/(?:(Vorname[\:\s]*))(.*)/gim);
        nachname = findLabeledValue(/(?:(Nachname[\:\s]*))(.*)/gim);
        firma = findLabeledValue(/(?:(Firma[\:\s]*))(.*)/gim);
        strasse = findLabeledValue(/(?:(Strasse[\:\s]*))(.*)/gim);
        telefon = findLabeledValue(/(?:(Telefon[\:\s]*))(.*)/gim);
        email = findLabeledValue(/(?:(Email[\:\s]*))(.*)/gim);
        
        // Spezialbehandlung für Plz/Ort
        var plz_ort_labeled = findLabeledValue(/(?:(Plz\/Ort[\:\s]*))(.*)/gim);
        if (plz_ort_labeled) {
            var plz_match = plz_ort_labeled.match(/(\d{5})/);
            if (plz_match) {
                postleitzahl = plz_match[1];
                // Nimm alles andere als Ort
                ort = plz_ort_labeled.replace(plz_match[1], "").trim();
            } else {
                ort = plz_ort_labeled; // Falls keine PLZ gefunden
            }
        }
        
        // UI-Feedback für Labeled Mode
        document.getElementById("vorname_gf").innerHTML = 'Vorname (Labeled): ' + vorname;
        document.getElementById("nachname_gf").innerHTML = 'Nachname (Labeled): ' + nachname;
        document.getElementById("firma").innerHTML = 'Firma (Labeled): ' + firma;
        document.getElementById("strasse").innerHTML = 'Strasse (Labeled): ' + strasse;
        document.getElementById("postleitzahl").innerHTML = 'PLZ (Labeled): ' + postleitzahl;
        document.getElementById("ort").innerHTML = 'Ort (Labeled): ' + ort;
        document.getElementById("telefon").innerHTML = 'Telefon (Labeled): ' + telefon;
        document.getElementById("email").innerHTML = 'E-Mail (Labeled): ' + email;

    } else {
        
        // --- MODUS 2: UNSTRUCTURED DATA (Deine P1, P2, P3 Logik) ---

        // ========================================================================
        // START: NEUE, PRIORISIERTE NAMENS-LOGIK (P1, P2, P3)
        // ========================================================================

        // --- Priorität 1: Inhaber-geführte Firma (z.B. "Kurt Schuller ... GmbH") ---
        try {
            var re_owner_company = new RegExp(
                "^([\\p{L}-]+)\\s+([\\p{L}-]+)\\s+.*(AG|eG|e\\.K\\.|e\\.V\\.|GbR|gGmbH|GmbH|KGaA|KdöR|KG|OHG|PartG|UG)", 
                "gimu" // g=global, i=case-insensitive, m=multiline, u=UNICODE
            );
            
            var match = re_owner_company.exec(text);
            
            if (match) {
                vorname = match[1];
                nachname = match[2];
                firma = match[0].trim(); 
                
                document.getElementById("vorname_nachname").innerHTML = 'Name (aus Firmentitel): ' + vorname + " " + nachname;
                document.getElementById("vorname_gf").innerHTML = 'Vorname (Firmentitel): ' + vorname;
                document.getElementById("nachname_gf").innerHTML = 'Nachname (Firmentitel): ' + nachname;
                document.getElementById("firma").innerHTML = 'Firma (Firmentitel): ' + firma;
            } else {
                throw new Error("P1 (Owner-Company) failed, try P2 (Context-Anchor)");
            }

        } catch (e) {
            
            // --- Priorität 2: Anker "Inhaber: [Voller Unicode Name]" ---
            try {
                // \s+ durch [ \t]+ ersetzt, um Zeilenumbrüche zu verhindern
                var re_name_context = new RegExp(
                    "(?:Geschäftsführer|GF|Inhaber|Vorstand|vertreten durch)(?:in)?[:\\s]+((?:[\\p{L}-]+|von|dem)(?:[ \t]+[\\p{L}-]+)+)", 
                    "gimu" // g=global, i=case-insensitive, m=MULTILINE, u=UNICODE
                );

                var match_context = re_name_context.exec(text);
                var fullName = match_context[1].trim();
                
                var names = fullName.split(' ');
                nachname = names.pop();
                vorname = names.join(' '); 

                document.getElementById("vorname_nachname_gf").innerHTML = 'Name (Kontext-Fund): ' + fullName;
                document.getElementById("vorname_gf").innerHTML = 'Vorname (Kontext): ' + vorname;
                document.getElementById("nachname_gf").innerHTML = 'Nachname (Kontext): ' + nachname;
                
            } catch (e2) {
                
                // --- Priorität 3: Einfaches Einzelunternehmen (Nur "Vorname Nachname") ---
                try {
                    // \s durch [ \t]+ ersetzt
                    var re_sole_prop = new RegExp(
                        "^([\\p{L}-]+)[ \t]+([\\p{L}-]+)$", 
                        "gimu"
                    );
                    var match_sole = re_sole_prop.exec(text); 
                    vorname = match_sole[1];
                    nachname = match_sole[2];
                    vorname_nachname = match_sole[0];
                    
                    document.getElementById("vorname_nachname").innerHTML = 'Name (Einzelu.): ' + vorname_nachname;
                    document.getElementById("vorname_gf").innerHTML = 'Vorname (Einzelu.): ' + vorname;
                    document.getElementById("nachname_gf").innerHTML = 'Nachname (Einzelu.): ' + nachname;

                } catch (e3) {
                    // (Setzt leere Strings)
                    vorname = "";
                    nachname = "";
                    vorname_nachname = "";
                }
            }
        }
        // ========================================================================
        // ENDE: NEUE NAMENS-LOGIK
        // ========================================================================
        

        // --- FIRMA (FALLBACK) ---
        if (!firma) {
            try {
                var re_firma_context = new RegExp(
                    "(?:\\n.+)(AG|eG|e\\.K\\.|e\\.V\\.|GbR|gGmbH|GmbH|KGaA|KdöR|KG|OHG|PartG|UG|Aktiengesellschaft|Eingetragene Genossenschaft|Eingetragener Kaufmann|Eingetragener Verein|Einzelkaufmann|Einzelunternehmen|Fachhochschule|Freiberufler|gesellschaft|Gesellschaft bürgerlichen Rechts|gemeinnützige GmbH|Gesellschaft mit beschränkter Haftung|GmbH & Co\\. KG|Kommanditgesellschaft|Kommanditgesellschaft auf Aktien|Körperschaft des öffentlichen Rechts|Offene Handelsgesellschaft|Partnerschaftsgesellschaft|Stiftung|UG \\(haftungsbeschränkt\\)|Unternehmen|Universität)$",
                    "gimu"
                );
                var match_firma = re_firma_context.exec(text);
                firma = match_firma[0].trim();
                document.getElementById("firma").innerHTML = 'Firma (Rechtsform-Fund): ' + firma;
            }
            catch (e_firma) {
                try {
                    if (!vorname_nachname) { // Nur wenn nicht P3 (Einzelu.) zugetroffen hat
                        var re_firma_line1 = /^.+\n/gi;
                        var match_firma_line1 = re_firma_line1.exec(text);
                        firma = match_firma_line1[0].trim();
                        document.getElementById("firma").innerHTML = 'Firma (Zeile 1): ' + firma;
                    }
                }
                catch (e_firma_fallback) {
                    // (bleibt leer)
                }
            }
        }


        // ========================================================================
        // START: ADRESSE, KONTAKT & JOB (ÜBERARBEITET)
        // ========================================================================

        // --- PLZ & Ort (Priorität 1, da stärkster Anker) ---
        var full_plz_ort = "";
        try {
            // plz_ort_regex kommt aus der neuen lib/plz_ort_liste.js
            var match_plz_ort = plz_ort_regex.exec(text);
            full_plz_ort = match_plz_ort[0].trim();
            
            // PLZ extrahieren (die ersten 5 Ziffern)
            postleitzahl = full_plz_ort.match(/^(\d{5})/)[1];
            // Ort extrahieren (der Rest nach der PLZ, getrimmt)
            ort = full_plz_ort.substring(5).trim();
            
            document.getElementById("postleitzahl").innerHTML = 'Postleitzahl (Liste): ' + postleitzahl;
            document.getElementById("ort").innerHTML = 'Ort (Liste): ' + ort;

        } catch (e) {
             document.getElementById("postleitzahl").innerHTML = 'Postleitzahl: not found';
             document.getElementById("ort").innerHTML = 'Ort: not found';
        }


        // --- Strasse (nutzt PLZ/Ort-Fund als Anker) ---
        // *** NEUE LOGIK FÜR STRASSE ***
        if (postleitzahl && ort) { // Nur ausführen, wenn wir einen Anker haben
            try {
                // PRIORITÄT A: Straße steht in derselben Zeile (z.B. "... - Straße 123 - 70736 Fellbach")
                // Wir suchen nach einer Zeile, die "Straße Hausnummer" UND "PLZ Ort" enthält
                var re_strasse_inline = new RegExp(
                    // $1: Straße (alles was nach Straße+Hausnummer aussieht)
                    `(.+\\s\\d+[a-zA-Z]?)` +
                    // Trenner (z.B. " - " oder ", ")
                    `[\\s,-]+` +
                    // PLZ und Ort (Lookahead, um den Anker zu prüfen)
                    `(?=${postleitzahl}\\s+${escapeRegex(ort)})`,
                    "gimu"
                );
                
                var match_inline = re_strasse_inline.exec(text);
                
                if (match_inline) {
                    strasse = match_inline[1].trim();
                    // Oft steht noch Müll davor, z.B. "Shippingaddress: Gebäude B3, EG - "
                    // Wir nehmen den Teil nach dem letzten Bindestrich oder Komma
                    strasse = strasse.split(/[,-]/).pop().trim();
                    document.getElementById("strasse").innerHTML = 'Strasse (Inline-Fund): ' + strasse;
                } else {
                     // PRIORITÄT B: Straße steht in der Zeile darüber (wie bisher)
                    var re_strasse_context = new RegExp(
                        `(.+\\s\\d+[a-zA-Z]?)\\s*\\n+(?=${postleitzahl}\\s+${escapeRegex(ort)})`, 
                        "gimu" 
                    );
                    
                    strasse = re_strasse_context.exec(text)[1].trim();
                    document.getElementById("strasse").innerHTML = 'Strasse (Kontext): ' + strasse;
                }
            } catch (e) {
                 document.getElementById("strasse").innerHTML = 'Strasse: not found';
            }
        } else {
             document.getElementById("strasse").innerHTML = 'Strasse: not found (kein PLZ/Ort-Anker)';
        }

        
        // --- Job-Titel (Wird jetzt immer gesucht) ---
        // *** NEUE POSITION (aus Prio-2 verschoben) ***
        try {
            // Sucht nach typischen Jobtiteln, die oft *allein* in einer Zeile stehen
            var re_job_title = /^(Technical Sales Manager|Sales Manager|Managing Director|Prokurist|Geschäftsführerin|Geschäftsführung|Geschäftsführer|Inhaberin|Inhaber|Vorstand)$/gim;
            job_title = re_job_title.exec(text)[0];
            document.getElementById("job_title").innerHTML = 'Job Title: ' + job_title;
        } catch (e) {
             document.getElementById("job_title").innerHTML = 'Job Title: not found';
        }


        // Telefon mobil
        try {
            var re_telefon_mobil = /(?:\D)(((\+|00)\s*49(\s*\(0\)\s*)?\s*1)|01)(.*\d{1,14})/gim;
            telefon_mobil = re_telefon_mobil.exec(text)[0];
            telefon_mobil = clean_number(telefon_mobil);
            document.getElementById("telefon_mobil").innerHTML = 'Telefon mobil: ' + telefon_mobil;
        }catch (e) {
            // (bleibt leer)
        }

        // Telefon
        try {
            // *** FIX: Die Regex wurde angepasst, um auch Telefonnummern mit Zeilenumbruch zu fangen
            // Beispiel: "Phone: +49 711 \n 252674-12"
            // [\D\s\n]* erlaubt jetzt auch Newlines nach dem "Tel"-Keyword
            var re_telefon = /(?:Tel|Fon|Telefon|Phone)[\D\s\n]*((?!(?:15|16|17))(?:\+|0|0049).*\d{1,14})$/gim;
            
            // Wir müssen Zeilenumbrüche im Match entfernen
            var match_telefon = re_telefon.exec(text)[1];
            telefon = match_telefon.replace(/\n/g, "").replace(/\s+/g, " "); // Alle Newlines raus, Leerzeichen normalisieren
            
            telefon = clean_number(telefon);

            var re_telefon_check = /(01)|\+49\s?1|00\s?49\s?1.*/gim;
            if (re_telefon_check.test(telefon)) { 
                telefon = ""; 
            } else {
                document.getElementById("telefon").innerHTML = 'Telefon: ' + telefon; 
            }
        }catch (e) {
            // (bleibt leer)
        }

        // Fax
        try {
            var re_fax = /(?:Fax[.\:\(\s_-]*)((\+|0|0049).*\d{1,14}$)/gim;
            fax = re_fax.exec(text)[1];
            fax = clean_number(fax);
            document.getElementById("fax").innerHTML = 'Fax: ' + fax;
        } catch (e) {
            // (bleibt leer)
        }

        // E-Mail
        try {
            var re_email = /([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gim;
            email = re_email.exec(text)[0];
            document.getElementById("email").innerHTML = 'E-mail: ' + email;
        } catch (e) {
            // (bleibt leer)
        }

        // Url
        try{
            var re_www = /(?:Web|http|www)[\D\s]*(www\..*|http.*)/gim;
            www = re_www.exec(text)[1];
            document.getElementById("internet").innerHTML = 'Internet: '+ www;
        }catch (e) {
            try {
                if (email) {
                    var www_email_tld = "www." + email.split('@')[1];
                    document.getElementById("internet").innerHTML = 'Internet (aus E-Mail): ' + www_email_tld;
                    www = www_email_tld;
                }
            } catch(e2) {
                // (bleibt leer)
            }
        }

        // Umsatzsteuer-Identifikationsnummer
        try {
            var re_ustid = /((Ust|Umsatz)\S+(\s|:))(DE(\s)?.*\d{1,9})/gim;
            ustid = re_ustid.exec(text)[4].replace(/(\/|\s)/g, "");
            document.getElementById("ustid").innerHTML = 'Umsatzsteuer-Identifikationsnummer: ' + ustid;
        } catch (e) {
            // Steuernummer (als Fallback)
            try {
                var re_stnr = /(?:Steuer+[-\s|:.A-Za-z]*)\D(.*\d{1,9})/gim;
                stnr = re_stnr.exec(text)[1];
                document.getElementById("stnr").innerHTML = 'Steuernummer: ' + stnr;
            } catch (e2) {
                // (bleibt leer)
            }
        }

        // Registergericht
        try {
            var re_registergericht = new RegExp(
                "(?:(gericht\\w*[\\.:\\(\\s_-]*))([\\p{L}-]+)(\\s)([\\p{L}-]+)", 
                "gimu"
            );
            var match_rg = re_registergericht.exec(text);
            registergericht = match_rg[2] + " " + match_rg[4];
            document.getElementById("registergericht").innerHTML = 'Registergericht: ' + registergericht;
        } catch (e) {
            // (bleibt leer)
        }

        // Registernummer
        try {
            var re_registernummer = /((HRA|HRB|VR)\s\d+)/gim;
            registernummer = re_registernummer.exec(text)[0];
            document.getElementById("registernummer").innerHTML = 'Registernummer: ' + registernummer;
        } catch (e) {
            // (bleibt leer)
        }
    }

// ========================================================================
// ENDE: DIE INTELLIGENTE WEICHE
// ========================================================================

    // vCard Download-Link erstellen
    try{
        var vcard_export = vcard_gen();
        document.getElementById("vcard").innerHTML = vcard_export.replace(/\n/g, "<br>"); // Für die HTML-Ansicht

        let blob = new Blob([vcard_export], {type: 'text/plain;charset=utf-8'});
        link.href = URL.createObjectURL(blob);
    }catch (e) {
        document.getElementById("vcard").innerHTML = 'vcard: not found';
        console.error("vCard gen error: " + e);
    }

} // Ende text_input()


// ========================================================================
// HELPER FUNKTIONEN (Jetzt außerhalb von text_input())
// ========================================================================

function clean_number(number){
    var cleaned_number = number.toString();
    cleaned_number = cleaned_number.replace(/\+\s/, "+");
    cleaned_number = cleaned_number.replace(/\(0\)/g, "");
    cleaned_number = cleaned_number.replace(/[\-._\|\\\/\(\)\[\]\(\)\{\}]+/g, " ");
    cleaned_number = cleaned_number.replace(/\s{2,}/g, " ");
    return cleaned_number.trim();
}

function var_not_undefined(x){
    var x = (typeof x === 'undefined' || x === null) ? "" : x;
    return x;
}

// NEUE Helper-Funktion zum Escapen von Regex-Sonderzeichen
function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    // Escaped alle Zeichen, die in einer Regex eine Sonderbedeutung haben
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, "\\$1");
}

// ========================================================================
// VCARD ERSTELLUNG (Jetzt außerhalb von text_input())
// ========================================================================

function vcard_gen(){

    var vc_n = var_not_undefined(nachname);
    var vc_fn = var_not_undefined(vorname);
    var vc_title = var_not_undefined(job_title);
    var vc_org = var_not_undefined(firma);
    var vc_adr = var_not_undefined(strasse) + ";" + var_not_undefined(ort) + ";;" + var_not_undefined(postleitzahl) + ";Deutschland"; // Land hinzugefügt
    var vc_tel = var_not_undefined(telefon);
    var vc_tel_cell = var_not_undefined(telefon_mobil);
    var vc_tel_fax = var_not_undefined(fax);
    var vc_url = var_not_undefined(www);
    var vc_email = var_not_undefined(email);
    var vc_note = 'UStID: ' + var_not_undefined(ustid) + ' StNr: ' + var_not_undefined(stnr) + ' Register: ' + var_not_undefined(registergericht) + ' ' + var_not_undefined(registernummer);

    var vcard = "BEGIN:VCARD" + "\n" +
    "VERSION:3.0" + "\n" +
    "N;CHARSET=utf-8:" + vc_n + ";" + vc_fn + "\n" +
    "FN;CHARSET=utf-8:" + vc_fn + " " + vc_n + "\n" +
    "ORG;CHARSET=utf-8:" + vc_org + "\n" +
    "TITLE;CHARSET=utf-8:" + vc_title + "\n" +
    "ADR;CHARSET=utf-8;WORK:;;" + vc_adr + "\n" +
    "TEL;CHARSET=utf-8;WORK;VOICE:" + vc_tel + "\n" +
    "TEL;CHARSET=utf-8;TYPE=CELL:" + vc_tel_cell + "\n" +
    "TEL;CHARSET=utf-8;WORK;FAX:" + vc_tel_fax + "\n" +
    "URL;CHARSET=utf-8;TYPE=WORK:" + vc_url + "\n" +
    "EMAIL;INTERNET;CHARSET=utf-8;TYPE=WORK:" + vc_email + "\n" +
    "NOTE;CHARSET=utf-8:" + vc_note.replace(/\n/g, "\\n") + "\n" +
    "END:VCARD";

    return vcard;
}
