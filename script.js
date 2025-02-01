document.getElementById('marketForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const marktNumber = document.getElementById('marktNumber').value;
    const email = document.getElementById('email').value;
    const errorDiv = document.getElementById('error-message');
    const imageContainer = document.getElementById('image-container');
    const storeImage = document.getElementById('storeImage');
    const downloadButton = document.getElementById('downloadButton');
    const submitButton = document.querySelector('#marketForm button[type="submit"]');
    
    // Reset previous states
    errorDiv.style.display = 'none';
    imageContainer.style.display = 'none';
    downloadButton.style.display = 'none'; // Reset download button

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

        // Handle sections
        if (section1 && section0) {
            // Get complete content for each section including all children
            const section1Content = getCompleteSectionContent(section1);
            const section0Content = getCompleteSectionContent(section0);

            // Open in separate tabs
            const section1SVG = createSectionSVG('1', section1Content);
            const section0SVG = createSectionSVG('0', section0Content);

            const blob1 = new Blob([section1SVG], { type: 'text/html' });
            const url1 = URL.createObjectURL(blob1);
            const newTab1 = window.open(url1, 'section_1');
            if (newTab1) {
                newTab1.focus();
            }

            const blob0 = new Blob([section0SVG], { type: 'text/html' });
            const url0 = URL.createObjectURL(blob0);
            const newTab0 = window.open(url0, 'section_0');
            if (newTab0) {
                newTab0.focus();
            }

            // Update download button
            downloadButton.style.display = 'block'; // Make button visible
            downloadButton.style.visibility = 'visible'; // Ensure button is visible
            downloadButton.style.opacity = '1'; // Ensure button is fully opaque

            downloadButton.onclick = () => {
                const downloadSection = (sectionId, sectionContent) => {
                    const sectionSVG = createSectionSVG(sectionId, sectionContent);
                    const blob = new Blob([sectionSVG], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `store-${marktNumber}-section-${sectionId}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                };

                downloadSection('1', section1Content);
                downloadSection('0', section0Content);
            };
        } else {
            // Fallback to original behavior if sections not found
            storeImage.innerHTML = svgText;
            imageContainer.style.display = 'block';
            
            const blob = new Blob([svgText], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const newTab = window.open(url, '_blank');
            if (newTab) {
                newTab.focus();
            }
        }

    } catch (error) {
        errorDiv.textContent = `Fehler: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        spinner.remove();
    }
});