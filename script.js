document.getElementById('marketForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const marktNumber = document.getElementById('marktNumber').value;
    const email = document.getElementById('email').value;
    const errorDiv = document.getElementById('error-message');
    const imageContainer = document.getElementById('image-container');
    const storeImage = document.getElementById('storeImage');
    const downloadButton = document.getElementById('downloadButton');
    var apiUrl = ''
    
    // Reset previous states
    errorDiv.style.display = 'none';
    imageContainer.style.display = 'none';
    downloadButton.style.display = 'none';
    
    try {
        // Hier müssten Sie Ihre API-URL einsetzen
        apiUrl = `https://api.live.app.obi.de/v1/stores/${marktNumber}?country=${email.slice(-2)}`;
        
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'image/vnd.obi.companion.store.svg+xml;version=1',
            },
        };
        
        const response = await fetch(apiUrl, options);
        
        if (!response.ok) {
            const statusText = response.statusText || 'No status text';
            throw new Error(`API Fehler: ${response.status}`);
        }
        
        // Read response as text first to check content
        const svgText = await response.text();
        console.log('Received SVG:', svgText.slice(0, 100)); // Log first part of SVG
        
        // Use direct SVG injection instead of blob URL
        storeImage.innerHTML = svgText;
        imageContainer.style.display = 'block';
        
        // Download Button Code hier einfügen
        downloadButton.style.display = 'block';
        downloadButton.onclick = () => {
            const blob = new Blob([svgText], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `store-${marktNumber}.html`;
            a.click();
            
            URL.revokeObjectURL(url);
        };
        
    } catch (error) {
        errorDiv.textContent = `Fehler: ${error.message} + ${apiUrl}`;
        errorDiv.style.display = 'block';
    }
});