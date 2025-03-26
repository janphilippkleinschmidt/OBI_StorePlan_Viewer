document.getElementById('marketForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const marktNumber = document.getElementById('marktNumber').value; //userinput "Marktnummer"
    const email = document.getElementById('email').value; //userinput "E-Mail Adresse"
    const submitButton = document.querySelector('#marketForm button[type="submit"]');
    const submitButtonElement = document.getElementById('submitbutton');
    const FormButton = document.querySelector('.report-changes-container .report-changes-link');
    const reportChangesContainer = document.querySelector('.report-changes-container');

    const PROXY_API_KEY = "{{ PROXY_API_KEY }}";
    const OBI_URL = "{{ OBI_API }}";

    const proxyUrl = 'https://proxy.cors.sh/';

    var storename = '';
    
    function updateStatus(message, type = 'loading') {
        const statusDiv = document.querySelector('.status-content');
        statusDiv.innerHTML = ''; // Delete previous status
        
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

    function setFormURL() { //Custom/ dynamic Google Forms URL
        var FormQ1 = marktNumber; //markt nummer field
        var FormQ2 = email; //email field
        var FormQ3 = ''; // Ja / Nein selection
        var FormQ4 = ''; //änderungsbedarf text field
        var FormBaseURL = `https://docs.google.com/forms/d/e/1FAIpQLSfDlNxdmDdmLCrGu71CuLTMxYXZ7hoRSpO82xuIv5XqEyXOlw/viewform?usp=pp_url&entry.1016517630=${FormQ1}&entry.1540606585=${FormQ2}&entry.1866007651=${FormQ3}&entry.728342376=${FormQ4}`;

        FormButton.href = FormBaseURL;
    }

    setFormURL();
    updateStatus('Anpassung der Google Forms URL');
    
    const existingViewButtons = document.querySelectorAll('.view-buttons-container'); //remove the "Marktplan anzeigen" buttons
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
        
        updateStatus('Marktplan wird angefordert...'); //Waiting for API response...
        const response = await fetch(apiUrl, options);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`API Fehler: ${response.status}. Der Marktplan zu der angegebenen Marktnummer konnte nicht gefunden werden`);
            } else {
                throw new Error(`API Fehler: ${response.status}.`);
            }
        }
        
        updateStatus('Marktplan erhalten...'); //Received API response
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
        const storey_EG = doc.querySelector('g[id="0"]'); //EG
        const storey_OG = doc.querySelector('g[id="1"]'); //OG
        const storey_UG = doc.querySelector('g[id="-1"]'); //UG
        
        updateStatus('Erstelle separate SVG-Dokumente...');
        const createstorey_SVG = (sectionId, storey_Content) => {
            return `
                <?xml version="1.0" encoding="utf-8"?>
                <svg width="2000px" height="2000px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 3000 3000" preserveAspectRatio="xMidYMid meet" enable-background="new 0 0 3000 2000" xml:space="preserve">
                ${storey_Content}
                </svg>
            `;
        };
        
        const getCompletestorey_Content = (section) => {
            const serializer = new XMLSerializer();
            const storey_Content = serializer.serializeToString(section);
            return storey_Content;
        };

        storename = await extractTitleFromHtml(svgText); //save title of html to display in the "success" message
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
        
        if ((storey_OG || storey_UG) && storey_EG) { // found multiple storeys
            
            const storey_OG_UG_Content = storey_OG ? getCompletestorey_Content(storey_OG) : getCompletestorey_Content(storey_UG);
            const storey_EG_Content = getCompletestorey_Content(storey_EG);
            
            updateStatus('Erstelle Ansicht-Links...');
            const storey_OG_UG_SVG = createstorey_SVG('1', storey_OG_UG_Content);
            const storey_EG_SVG = createstorey_SVG('0', storey_EG_Content);
            
            updateStatus('Erstelle Download-Links...');
            function encodeSVG(svgString) {
                return btoa(unescape(encodeURIComponent(svgString)));
            }
            
            function decodeSVG(base64String) {
                return decodeURIComponent(escape(atob(base64String)));
            }

            const base64_SVG_1 = encodeSVG(storey_OG_UG_SVG);
            const base64_SVG_0 = encodeSVG(storey_EG_SVG);
            //const base64_SVG_1 = btoa(storey_OG_UG_SVG);
            //const base64_SVG_0 = btoa(storey_EG_SVG);
            
            updateStatus('Erstelle "Anzeigen"-Schaltfläche...');
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            if (storey_OG) {
                viewButtonsContainer.innerHTML = `
                    <button id="viewSection1" class="view-btn">Obergeschoss anzeigen</button>
                    <button id="viewSection0" class="view-btn">Erdgeschoss anzeigen</button>
                `;
            } else if (storey_UG) {
                viewButtonsContainer.innerHTML = `
                    <button id="viewSection1" class="view-btn">Untergeschoss anzeigen</button>
                    <button id="viewSection0" class="view-btn">Erdgeschoss anzeigen</button>
                `;
            }
            
            document.querySelector('.button-container').append(viewButtonsContainer);
            
            updateStatus('Füge Event-Listener hinzu...');
            document.getElementById('viewSection1').addEventListener('click', () => {
                const newTab = window.open('_blank');
                newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { margin: 0; padding: 20px; }
                                svg { max-width: 100%; height: auto; }
                            </style>
                        </head>
                        <body>
                            ${decodeSVG(base64_SVG_1)}
                        </body>
                    </html>
                `);

                reportChangesContainer.style.display = 'block'; // Show the "Report Changes" button
            });
            
            document.getElementById('viewSection0').addEventListener('click', () => {
                const newTab = window.open('_blank');
                newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { margin: 0; padding: 20px; }
                                svg { max-width: 100%; height: auto; }
                            </style>
                        </head>
                        <body>
                        ${decodeSVG(base64_SVG_0)}
                        </body>
                    </html>
                `);

                reportChangesContainer.style.display = 'block'; // Show the "Report Changes" button
            });
            
            updateStatus('Fertig! Markplan mit mehreren Stockwerken verfügbar: ', 'success');
            
        } else { // found one storey
            const storey_Content = getCompletestorey_Content(doc);
            const storey_SVG = createstorey_SVG('0', storey_Content);

            updateStatus('Erstelle Download-Links...');
            function encodeSVG(svgString) {
                return btoa(unescape(encodeURIComponent(svgString)));
            }
            
            function decodeSVG(base64String) {
                return decodeURIComponent(escape(atob(base64String)));
            }
            const base64_SVG = encodeSVG(storey_SVG);
            //const base64_SVG = btoa(storey_SVG);

            updateStatus('Erstelle "Anzeigen"-Schaltfläche...');
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            viewButtonsContainer.innerHTML = `
            <button id="viewSection1" class="view-btn">Marktplan anzeigen</button>
            `;
            document.querySelector('.button-container').append(viewButtonsContainer);

            updateStatus('Füge Event-Listener hinzu...');
            document.getElementById('viewSection1').addEventListener('click', () => {
                const newTab = window.open('_blank');
                newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { margin: 0; padding: 20px; }
                                svg { max-width: 100%; height: auto; }
                            </style>
                        </head>
                        <body>
                        ${decodeSVG(base64_SVG)}
                        </body>
                    </html>
                `);
                
                reportChangesContainer.style.display = 'block';
            });

            updateStatus('Fertig! Markplan verfügbar: ', 'success');
        }
    } catch (error) {
        if (error.message.includes("404")) { //404 indicates that the combination of the storen number and the country code dont match
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
        submitButtonElement.disabled = false; //reactivate submit button
        submitButton.classList.remove('disabled-button');
    }
});