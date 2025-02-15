document.getElementById('marketForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const marktNumber = document.getElementById('marktNumber').value; //userinput "Marktnummer"
    const email = document.getElementById('email').value; //userinput "E-Mail Adresse"
    // const downloadButton = document.getElementById('downloadButton');
    const submitButton = document.querySelector('#marketForm button[type="submit"]');
    const submitButtonElement = document.getElementById('submitbutton');
    const FormButton = document.querySelector('.report-changes-container .report-changes-link');

    const PROXY_API_KEY = "{{ PROXY_API_KEY }}";
    const OBI_URL = "{{ OBI_API }}";

    const proxyUrl = 'https://proxy.cors.sh/';

    var storename = '';

    //Custom Forms URL
    var FormQ1 = marktNumber;
    var FormQ2 = email;
    var FormQ3 = '';
    var FormQ4 = '';
    var FormBaseURL = `https://docs.google.com/forms/d/e/1FAIpQLSfDlNxdmDdmLCrGu71CuLTMxYXZ7hoRSpO82xuIv5XqEyXOlw/viewform?usp=pp_url&entry.1016517630=${FormQ1}&entry.1540606585=${FormQ2}&entry.1866007651=${FormQ3}&entry.728342376=${FormQ4}`;

    FormButton.href = FormBaseURL;

    
    function updateStatus(message, type = 'loading') {
        const statusDiv = document.querySelector('.status-content');
        statusDiv.innerHTML = ''; // Lösche vorherigen Status
        
        const statusStep = document.createElement('div');
        statusStep.className = `status-step status-${type}`;
        console.log(message);
        
        switch(type) {
            case 'success':
                statusStep.innerHTML = `<span class="status-success">${message}${storename}</span>`;
                break;
            case 'error':
                statusStep.innerHTML = `<span class="status-error">${message}</span>`;
                break;
            default:
                statusStep.textContent = message;
        }
    
        statusDiv.appendChild(statusStep);
        statusDiv.scrollTop = statusDiv.scrollHeight;
        
        if (type === 'success') {
            const statusSpinner = statusDiv.querySelector('.status-step');
            if (statusSpinner) {
                statusSpinner.style.setProperty('--spinner-animation', 'none');
            }
        }
    }

    updateStatus('Starte Marktplan-Anfrage...');
    
    //downloadButton.style.display = 'none'; // Reset downloadbutton state
    const existingViewButtons = document.querySelectorAll('.view-buttons-container');
    existingViewButtons.forEach(button => button.remove());

    try {
        submitButtonElement.disabled = true;
        submitButton.classList.add('disabled-button');

        updateStatus('API-Anfrage wird vorbereitet...');
        
        const apiUrl = `${proxyUrl}${OBI_URL}${marktNumber}?country=${email.slice(-2)}`;
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'image/vnd.obi.companion.store.svg+xml;version=1',
                'x-cors-api-key': PROXY_API_KEY
            },
        };
        
        updateStatus('Marktplan wird angefordert...'); //Warte auf API-Antwort..
        const response = await fetch(apiUrl, options);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`API Fehler: ${response.status}. Der Marktplan zu der angegebenen Marktnummer konnte nicht gefunden werden`);
            } else {
                throw new Error(`API Fehler: ${response.status}.`);
            }
        }
        
        updateStatus('Marktplan erhalten...'); //API-Antwort erhalten...
        const svgText = await response.text();
        console.log('Received SVG:', svgText.slice(0, 100));
        
        // SVG Parsing
        updateStatus('Parse SVG-Daten...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'text/xml');
        
        updateStatus('Entferne Navigation-Helfer...');
        const navigationHelpers = doc.querySelectorAll('[id="Navigation-Helper"]');
        navigationHelpers.forEach(helper => helper.remove());

        
        updateStatus('Identifiziere Marktplan-Ebenen...');
        const section1 = doc.querySelector('g[id="1"]');
        const section0 = doc.querySelector('g[id="0"]');
        const section1Var = doc.querySelector('g[id="-1"]');
        
        updateStatus('Erstelle separate SVG-Dokumente...');
        const createSectionSVG = (sectionId, sectionContent) => {
            return `
                <?xml version="1.0" encoding="utf-8"?>
                <svg width="2000px" height="2000px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 3000 3000" preserveAspectRatio="xMidYMid meet" enable-background="new 0 0 3000 2000" xml:space="preserve">
                ${sectionContent}
                </svg>
            `;
        };
        
        const getCompleteSectionContent = (section) => {
            const serializer = new XMLSerializer();
            const sectionContent = serializer.serializeToString(section);
            return sectionContent;
        };

        // Titel extrahieren und protokollieren
        storename = await extractTitleFromHtml(svgText);
        console.log('Marktname:', storename);

        async function extractTitleFromHtml(html) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const titleElement = doc.querySelector('title');
                return titleElement ? titleElement.textContent.trim() : null;
            } catch (error) {
                console.error('Fehler beim Parsen des Titels:', error);
                return null;
            }
        }

        updateStatus('Bereite Markplan vor...');
        const existingViewButtons = document.querySelectorAll('.view-buttons-container');
        existingViewButtons.forEach(button => button.remove());

        // document.querySelector('.download-options').removeAttribute('style');
        // document.getElementById('downloadButton').removeAttribute('style');
        // document.querySelector('.download-options').style.display = 'block';
        // document.getElementById('downloadButton').style.display = 'block';
        
        
        if ((section1 || section1Var) && section0) { // Mehrere Etagen gefunden
            
            const section1Content = section1 ? getCompleteSectionContent(section1) : getCompleteSectionContent(section1Var);
            const section0Content = getCompleteSectionContent(section0);
            
            updateStatus('Erstelle Ansicht-Links...');
            const section1SVG = createSectionSVG('1', section1Content);
            const section0SVG = createSectionSVG('0', section0Content);
            
            updateStatus('Erstelle Download-Links...');
            const blob1 = new Blob([section1SVG], { type: 'text/html' });
            const url1 = URL.createObjectURL(blob1);
            const blob0 = new Blob([section0SVG], { type: 'text/html' });
            const url0 = URL.createObjectURL(blob0);
            
            updateStatus('Erstelle "Anzeigen"-Schaltfläche...');
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            if (section1) {
                viewButtonsContainer.innerHTML = `
                    <button id="viewSection1" class="view-btn">Obergeschoss anzeigen</button>
                    <button id="viewSection0" class="view-btn">Erdgeschoss anzeigen</button>
                `;
            } else if (section1Var) {
                viewButtonsContainer.innerHTML = `
                    <button id="viewSection1" class="view-btn">Untergeschoss anzeigen</button>
                    <button id="viewSection0" class="view-btn">Erdgeschoss anzeigen</button>
                `;
            }
            
            document.querySelector('.button-container').append(viewButtonsContainer);
            
            updateStatus('Füge Event-Listener hinzu...');
            document.getElementById('viewSection1').addEventListener('click', () => {
                window.open(url1, '_blank');
            });
            
            document.getElementById('viewSection0').addEventListener('click', () => {
                window.open(url0, '_blank');
            });
            
            // updateStatus('Konfiguriere Download-Funktion...');
            // downloadButton.onclick = () => {
            //     updateStatus('Starte Download-Vorgang...');
            //     const downloadSection = (sectionId, sectionContent) => {
            //         const sectionSVG = createSectionSVG(sectionId, sectionContent);
            //         const blob = new Blob([sectionSVG], { type: 'text/html' });
            //         const url = URL.createObjectURL(blob);
            //         const a = document.createElement('a');
            //         a.href = url;
            //         a.download = `Marktplan-${marktNumber}-Etage-${sectionId}.html`;
            //         a.click();
            //         URL.revokeObjectURL(url);
            //     };
                
            //     downloadSection('1', section1Content);
            //     downloadSection('0', section0Content);
            //     updateStatus('Download abgeschlossen: ', 'success');
            // };
            
            updateStatus('Fertig! Markplan mit mehreren Stockwerken verfügbar: ', 'success');
            
        } else { // Eine Etage gefunden

            const sectionContent = getCompleteSectionContent(doc);

            const sectionSVG = createSectionSVG('0',sectionContent);
            
            const blob = new Blob([sectionSVG], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            updateStatus('Erstelle "Anzeigen"-Schaltfläche...');
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            viewButtonsContainer.innerHTML = `
                <button id="viewPlan" class="view-btn">Marktplan anzeigen</button>
            `;
            
            document.querySelector('.button-container').append(viewButtonsContainer);
            
            updateStatus('Füge Event-Listener hinzu...');
            document.getElementById('viewPlan').addEventListener('click', () => {
                window.open(url, '_blank');
            });
            
            // updateStatus('Konfiguriere Download-Funktion...');
            // downloadButton.onclick = () => {
            //     updateStatus('Starte Download-Vorgang...');
            //     const downloadFile = () => {
            //         const blob = new Blob([sectionSVG], { type: 'text/html' });
            //         const url = URL.createObjectURL(blob);
            //         const a = document.createElement('a');
            //         a.href = url;
            //         a.download = `Marktplan-${marktNumber}.html`;
            //         a.click();
            //         URL.revokeObjectURL(url);
            //     };
                
            //     downloadFile();
            //     updateStatus('Download abgeschlossen: ', 'success');
            // };
            
            updateStatus('Fertig! Markplan verfügbar: ', 'success');
        }
        
    } catch (error) {
        if (error.message.includes("404")) {
            updateStatus(`Fehler aufgetreten: ${error.message}.`, 'error');
        } else {
            updateStatus(`Fehler aufgetreten: ${error.message}. Bitte versuche es in ein paar Minuten erneut.`, 'error');
        }
        
        
        console.error('Request failed:', {
            status: error.status,
            message: error.message,
            url: error.url
        });
    } finally {
        submitButtonElement.disabled = false;
        submitButton.classList.remove('disabled-button');
    }
});