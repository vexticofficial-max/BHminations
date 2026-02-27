const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if(body.classList.contains('dark-mode')) {
        themeToggle.innerText = "☀️ Işık Modu";
    } else {
        themeToggle.innerText = "🌙 Karanlık Mod";
    }
});

// Basit Anti-Hile: Sağ Tık Engelleme (Opsiyonel)
/*
document.addEventListener('contextmenu', (e) => {
    alert("BHminations Güvenliği: Sağ tık engellendi!");
    e.preventDefault();
});
*/
