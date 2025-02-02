document.getElementById('marketForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const marktNumber = document.getElementById('marktNumber').value;
    const email = document.getElementById('email').value;
    const errorDiv = document.getElementById('error-message');
    const downloadButton = document.getElementById('downloadButton');
    const submitButton = document.querySelector('#marketForm button[type="submit"]');
    
    // Reset previous states
    errorDiv.style.display = 'none';
    downloadButton.style.display = 'none';

    // Add loading spinner
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    submitButton.parentNode.insertBefore(spinner, submitButton.nextSibling);

    try {
        const proxyUrl = 'https://proxy.cors.sh/';
        const apiUrl = `${proxyUrl}https://api.live.app.obi.de/v1/stores/${marktNumber}?country=${email.slice(-2)}`;
        
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'image/vnd.obi.companion.store.svg+xml;version=1',
            },
        };

        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            throw new Error(`API Fehler: ${response.status}`);
        }

        const svgText = await response.text();
        console.log('Received SVG:', svgText.slice(0, 100));

        // Find only the top level sections with IDs 1 and 0
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'text/xml');
        const section1 = doc.querySelector('g[id="1"]');
        const section0 = doc.querySelector('g[id="0"]');

        // Create separate SVGs for each section
        const createSectionSVG = (sectionId, sectionContent) => {
            return `
                <?xml version="1.0" encoding="utf-8"?>
                <svg width="3000px" height="2000px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 3000 2000" enable-background="new 0 0 3000 2000" xml:space="preserve">
                    ${sectionContent}
                </svg>
            `;
        };


        // Helper function to get complete section content including children
        const getCompleteSectionContent = (section) => {
            const serializer = new XMLSerializer();
            const sectionContent = serializer.serializeToString(section);
            return sectionContent;
        };

        // if store has multiple storeys 
        if (section1 && section0) {
            const existingViewButtons = document.querySelectorAll('.view-buttons-container');
            existingViewButtons.forEach(button => button.remove());
            // Remove existing display:none from HTML
            document.querySelector('.download-options').removeAttribute('style');
            document.getElementById('downloadButton').removeAttribute('style');

            // Then show both elements
            document.querySelector('.download-options').style.display = 'block';
            document.getElementById('downloadButton').style.display = 'block';
            // Get complete content for each section including all children
            const section1Content = getCompleteSectionContent(section1);
            const section0Content = getCompleteSectionContent(section0);

            // Open in separate tabs
            const section1SVG = createSectionSVG('1', section1Content);
            const section0SVG = createSectionSVG('0', section0Content);

            const blob1 = new Blob([section1SVG], { type: 'text/html' });
            const url1 = URL.createObjectURL(blob1);

            const blob0 = new Blob([section0SVG], { type: 'text/html' });
            const url0 = URL.createObjectURL(blob0);

            // Add view buttons
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            viewButtonsContainer.innerHTML = `
                <button id="viewSection1" class="view-btn">Obergeschoss anzeigen</button>
                <button id="viewSection0" class="view-btn">Erdgeschoss anzeigen</button>
            `;
            
            document.querySelector('.download-options').before(viewButtonsContainer);
            
            // Add event listeners for view buttons
            document.getElementById('viewSection1').addEventListener('click', () => {
                window.open(url1, '_blank');
            });
            
            document.getElementById('viewSection0').addEventListener('click', () => {
                window.open(url0, '_blank');
            });
            

            downloadButton.onclick = () => {
                const downloadSection = (sectionId, sectionContent) => {
                    const sectionSVG = createSectionSVG(sectionId, sectionContent);
                    const blob = new Blob([sectionSVG], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Markplan-${marktNumber}-Etage-${sectionId}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                };

                downloadSection('1', section1Content);
                downloadSection('0', section0Content);
            };
        } else { //if store has one storey

            const existingViewButtons = document.querySelectorAll('.view-buttons-container');
            existingViewButtons.forEach(button => button.remove());
                        
            // Remove existing display:none from HTML
            document.querySelector('.download-options').removeAttribute('style');
            document.getElementById('downloadButton').removeAttribute('style');
            
            // Then show both elements
            document.querySelector('.download-options').style.display = 'block';
            document.getElementById('downloadButton').style.display = 'block';
            
            // Create blob for single view
            const blob = new Blob([svgText], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            // Add view button
            const viewButtonsContainer = document.createElement('div');
            viewButtonsContainer.className = 'view-buttons-container';
            viewButtonsContainer.innerHTML = `
                <button id="viewPlan" class="view-btn">Markplan anzeigen</button>
            `;
            
            document.querySelector('.download-options').before(viewButtonsContainer);
            
            // Add event listener for view button
            document.getElementById('viewPlan').addEventListener('click', () => {
                window.open(url, '_blank');
            });
            
            downloadButton.onclick = () => {
                const downloadFile = () => {
                    const blob = new Blob([svgText], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Markplan-${marktNumber}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                };
                downloadFile();
            };
        }

    } catch (error) {
        errorDiv.textContent = `Fehler: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        spinner.remove();
    }
});
