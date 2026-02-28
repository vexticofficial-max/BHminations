/**
 * Vextic - Ultimate Edition
 * Kurucu: Alper
 */

// 1. FIREBASE BAŞLATMA
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. ANA SAYFA VİDEO YÜKLEME (DÜZELTİLDİ)
async function loadVideos() {
    const container = document.getElementById('video-grid');
    if (!container) return;

    db.collection('videos').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const video = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => openVideoModal(video);
            card.innerHTML = `
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg">
                </div>
                <div class="video-info-main" style="display:flex; padding:10px; gap:10px;">
                    <img src="${video.authorAvatar || ''}" style="width:36px; height:36px; border-radius:50%;">
                    <div class="video-text">
                        <h3 style="font-size:14px; color:var(--text-color);">${video.title}</h3>
                        <p style="font-size:12px; color:var(--secondary-text);">${video.authorName} • ${video.views || 0} izlenme</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// 3. FULL WATCH PAGE (LİKE, YORUM, YANIT, ABONE)
async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'flex';

    // İzlenme Artır (Session kontrolü)
    if (!sessionStorage.getItem(`v_${video.id}`)) {
        db.collection('videos').doc(video.id).update({ views: firebase.firestore.FieldValue.increment(1) });
        sessionStorage.setItem(`v_${video.id}`, 'true');
    }

    const authorDoc = await db.collection('users').doc(video.authorId).get();
    const isSubbed = auth.currentUser && authorDoc.data()?.subscribers?.includes(auth.currentUser.uid);

    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:var(--bg-color); color:var(--text-color); overflow-y:auto;">
            <button onclick="closeVideoModal()" style="position:fixed; top:20px; right:30px; background:none; border:none; color:white; font-size:40px; cursor:pointer; z-index:9999;">&times;</button>
            
            <div style="flex:3; padding:20px;">
                <iframe width="100%" style="aspect-ratio:16/9; border-radius:12px;" src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                <h1>${video.title}</h1>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" style="width:40px; height:40px; border-radius:50%;">
                        <div>
                            <h4 style="margin:0;">${video.authorName}</h4>
                            <p style="font-size:12px; color:var(--secondary-text);">${authorDoc.data()?.subscribers?.length || 0} abone</p>
                        </div>
                        <button onclick="toggleSub('${video.authorId}', ${isSubbed})" style="background:${isSubbed ? 'var(--hover-bg)' : 'var(--text-color)'}; color:${isSubbed ? 'var(--text-color)' : 'var(--bg-color)'}; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">
                            ${isSubbed ? 'Abonelikten Çık' : 'Abone Ol'}
                        </button>
                    </div>
                    <div style="display:flex; gap:10px; background:var(--hover-bg); border-radius:20px; padding:5px 15px;">
                        <button onclick="likeVideo('${video.id}')">👍 ${video.likes || 0}</button>
                        <button>👎</button>
                        <button onclick="shareVideo('${video.id}')">🔗 Paylaş</button>
                    </div>
                </div>
                <div style="margin-top:20px;">
                    <h3>Yorumlar</h3>
                    <div style="display:flex; gap:10px; margin:15px 0;">
                        <input id="c-input" type="text" placeholder="Yorum ekle..." style="flex:1; background:none; border:none; border-bottom:1px solid var(--border-color); color:var(--text-color); padding:10px; outline:none;">
                        <button onclick="addComment('${video.id}')" style="background:var(--blue); color:white; padding:10px 20px; border-radius:20px;">Yorum Yap</button>
                    </div>
                    <div id="comments-list"></div>
                </div>
            </div>
            <div id="side-videos" style="flex:1; padding:20px; border-left:1px solid var(--border-color);"></div>
        </div>
    `;
    renderComments(video.id, video.authorId);
}

// 4. VİDEO YAYINLAMA (LİNK İLE)
async function publishVideoFromLink() {
    const url = document.getElementById('v-url').value;
    const title = document.getElementById('v-title').value;
    const category = document.getElementById('v-category').value;
    
    if(!url || !title || !auth.currentUser) return alert("Eksik bilgi veya giriş yapılmadı!");

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if(!videoId) return alert("Geçersiz YouTube linki!");

    await db.collection('videos').add({
        title: title,
        youtubeId: videoId,
        category: category,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName,
        authorAvatar: auth.currentUser.photoURL,
        views: 0,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert("Video yayınlandı!");
    location.reload();
}

// YORUM VE YANIT SİSTEMİ (GERÇEK ZAMANLI)
function renderComments(vid, ownerId) {
    const list = document.getElementById('comments-list');
    db.collection('videos').doc(vid).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snap => {
        list.innerHTML = '';
        snap.forEach(doc => {
            const c = doc.data();
            const cid = doc.id;
            list.innerHTML += `
                <div style="margin-bottom:15px;">
                    <div style="display:flex; gap:10px;">
                        <img src="${c.avatar}" style="width:32px; height:32px; border-radius:50%;">
                        <div style="flex:1;">
                            <p style="font-size:13px; font-weight:bold;">${c.name}</p>
                            <p>${c.text}</p>
                            <button onclick="toggleReply('${cid}')" style="font-size:12px; color:var(--blue); background:none; border:none; cursor:pointer;">Yanıtla</button>
                            <div id="r-box-${cid}" style="display:none; margin-top:10px;">
                                <input id="ri-${cid}" type="text" placeholder="Yanıt yaz..." style="background:none; border:none; border-bottom:1px solid #444; color:white;">
                                <button onclick="addReply('${vid}', '${cid}')">Gönder</button>
                            </div>
                            <div id="replies-${cid}" style="margin-left:20px; border-left:1px solid #333; padding-left:10px;"></div>
                        </div>
                    </div>
                </div>
            `;
            loadReplies(vid, cid);
        });
    });
}

function closeVideoModal() {
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('video-modal').innerHTML = '';
}

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', loadVideos);
