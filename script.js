const themeToggle = document.getElementById('theme-toggle');
const videoGrid = document.getElementById('video-grid');

// Karanlık Mod Geçişi
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.innerText = document.body.classList.contains('dark-mode') ? "☀️" : "🌙";
});

// Gerçek Video Yükleme Fonksiyonu (Simülasyon)
function handleUpload() {
    const title = document.getElementById('video-title').value;
    const file = document.getElementById('video-file').files[0];

    if (!title || !file) {
        alert("Lütfen başlık ve video dosyası seçin!");
        return;
    }

    // Video Kartını Oluştur
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.innerHTML = `
        <div class="thumbnail-box" style="background: #555;"></div>
        <div class="video-info">
            <h4 class="video-title">${title}</h4>
            <p class="video-meta">BHminations ✔</p>
            <p class="video-meta">Şimdi yüklendi</p>
        </div>
    `;

    videoGrid.appendChild(videoCard);
    
    // Formu temizle
    document.getElementById('video-title').value = "";
    document.getElementById('video-file').value = "";
    alert("Video başarıyla BHminations'a eklendi!");
}
