/**
 * Vextic - Ultimate YouTube Clone
 * Kurucu: Alper
 */

// 1. FIREBASE YAPILANDIRMASI (Doğrudan ve Çalışan Yöntem)
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

// Firebase'i başlat
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. GİRİŞ VE KULLANICI İŞLEMLERİ
function googleLogin() {
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        // Kullanıcıyı veritabanına kaydet/güncelle
        db.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        location.reload();
    }).catch(err => alert("Giriş hatası: " + err.message));
}

function logout() {
    auth.signOut().then(() => location.reload());
}

auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfile) {
            userProfile.style.display = 'flex';
            userProfile.querySelector('img').src = user.photoURL;
        }
        loadUserSubscriptions(); // Abonelikleri yükle
    }
});

// 3. VİDEOLARI ANA SAYFAYA DİZME
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    db.collection('videos').orderBy('createdAt', 'desc').onSnapshot(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const v = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => openVideoModal(v);
            card.innerHTML = `
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg">
                </div>
                <div class="video-info-main" style="display:flex; padding:12px; gap:12px;">
                    <img src="${v.authorAvatar}" style="width:36px; height:36px; border-radius:50%;">
                    <div>
                        <h3 style="font-size:14px; margin-bottom:4px; color:var(--text-color);">${v.title}</h3>
                        <p style="font-size:12px; color:var(--secondary-text);">${v.authorName}</p>
                        <p style="font-size:12px; color:var(--secondary-text);">${v.views || 0} izlenme</p>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// 4. FULL WATCH PAGE (VİDEO İZLEME EKRANI)
async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'flex';

    // İzlenme Artır (Oturumda bir kez)
    if (!sessionStorage.getItem(`viewed_${video.id}`)) {
        db.collection('videos').doc(video.id).update({ views: firebase.firestore.FieldValue.increment(1) });
        sessionStorage.setItem(`viewed_${video.id}`, 'true');
    }

    const authorDoc = await db.collection('users').doc(video.authorId).get();
    const subData = authorDoc.data()?.subscribers || [];
    const isSubbed = auth.currentUser && subData.includes(auth.currentUser.uid);

    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:var(--bg-color); color:var(--text-color); overflow-y:auto; position:relative;">
            <button onclick="closeVideoModal()" style="position:fixed; top:20px; right:30px; background:none; border:none; color:white; font-size:40px; cursor:pointer; z-index:9999;">&times;</button>
            
            <div style="flex:3; padding:20px; max-width:1200px;">
                <iframe width="100%" style="aspect-ratio:16/9; border-radius:12px;" src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                <h1 style="margin:15px 0;">${video.title}</h1>
                
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" style="width:40px; height:40px; border-radius:50%; cursor:pointer;" onclick="goToProfile('${video.authorId}')">
                        <div>
                            <h4 style="margin:0;">${video.authorName}</h4>
                            <p style="font-size:12px; color:var(--secondary-text);">${subData.length} abone</p>
                        </div>
                        <button onclick="toggleSubscription('${video.authorId}', ${isSubbed})" style="background:${isSubbed ? 'var(--hover-bg)' : 'var(--text-color)'}; color:${isSubbed ? 'var(--text-color)' : 'var(--bg-color)'}; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">
                            ${isSubbed ? 'Abonelikten Çık' : 'Abone Ol'}
                        </button>
                    </div>
                    <div style="display:flex; gap:10px; background:var(--hover-bg); border-radius:20px; padding:5px 15px;">
                        <button onclick="handleLike('${video.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-color);">👍 ${video.likes || 0}</button>
                        <button style="background:none; border:none; cursor:pointer; color:var(--text-color);">👎</button>
                        <button onclick="shareVideo('${video.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-color);">🔗 Paylaş</button>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h3 id="comment-title">Yükleniyor...</h3>
                    <div style="display:flex; gap:10px; margin:20px 0;">
                        <input id="new-comment" type="text" placeholder="Yorum ekle..." style="flex:1; background:none; border:none; border-bottom:1px solid var(--border-color); color:var(--text-color); padding:10px; outline:none;">
                        <button onclick="postComment('${video.id}')" style="background:var(--blue); color:white; border:none; padding:10px 20px; border-radius:20px; cursor:pointer;">Yorum Yap</button>
                    </div>
                    <div id="comments-box"></div>
                </div>
            </div>
            
            <div id="side-vids" style="flex:1; padding:20px; border-left:1px solid var(--border-color); min-width:300px;">
                <h3>Sıradaki Videolar</h3>
            </div>
        </div>
    `;
    loadComments(video.id, video.authorId);
    loadNextVideos(video.id);
}

// 5. YORUM VE YANIT SİSTEMİ
function loadComments(vid, ownerId) {
    const box = document.getElementById('comments-box');
    db.collection('videos').doc(vid).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snap => {
        box.innerHTML = '';
        document.getElementById('comment-title').innerText = `${snap.size} Yorum`;
        snap.forEach(doc => {
            const c = doc.data();
            const cid = doc.id;
            const isOwner = auth.currentUser && auth.currentUser.uid === ownerId;
            const isMe = auth.currentUser && auth.currentUser.uid === c.uid;

            const div = document.createElement('div');
            div.style.marginBottom = "20px";
            div.innerHTML = `
                <div style="display:flex; gap:10px;">
                    <img src="${c.avatar}" style="width:36px; height:36px; border-radius:50%;">
                    <div style="flex:1;">
                        <p style="font-size:13px; font-weight:bold; margin:0;">${c.name}</p>
                        <p style="margin:5px 0;">${c.text}</p>
                        <div style="display:flex; gap:15px; font-size:12px; color:var(--secondary-text);">
                            <button onclick="showReplyBox('${cid}')" style="background:none; border:none; cursor:pointer; color:inherit;">Yanıtla</button>
                            ${(isOwner || isMe) ? `<button onclick="deleteComment('${vid}','${cid}')" style="background:none; border:none; cursor:pointer; color:red;">Sil</button>` : ''}
                        </div>
                        <div id="rb-${cid}" style="display:none; margin-top:10px;">
                            <input id="ri-${cid}" type="text" placeholder="Yanıtla..." style="background:none; border:none; border-bottom:1px solid #444; color:white; width:70%;">
                            <button onclick="postReply('${vid}','${cid}')" style="color:var(--blue); background:none; border:none; cursor:pointer;">Gönder</button>
                        </div>
                        <div id="replies-${cid}" style="margin-left:20px; border-left:1px solid #333; padding-left:10px; margin-top:10px;"></div>
                    </div>
                </div>
            `;
            box.appendChild(div);
            loadReplies(vid, cid);
        });
    });
}

// 6. YANITLAR
async function loadReplies(vid, cid) {
    const rBox = document.getElementById(`replies-${cid}`);
    db.collection('videos').doc(vid).collection('comments').doc(cid).collection('replies').orderBy('createdAt', 'asc').onSnapshot(snap => {
        rBox.innerHTML = '';
        snap.forEach(doc => {
            const r = doc.data();
            rBox.innerHTML += `
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <img src="${r.avatar}" style="width:24px; height:24px; border-radius:50%;">
                    <div>
                        <p style="font-size:12px; font-weight:bold; margin:0;">${r.name}</p>
                        <p style="font-size:13px; margin:2px 0;">${r.text}</p>
                    </div>
                </div>
            `;
        });
    });
}

// FONKSİYONLARIN DEVAMI (Like, Sub, Close, vs.)
async function toggleSubscription(authorId, isSub) {
    if(!auth.currentUser) return alert("Giriş yap!");
    const ref = db.collection('users').doc(authorId);
    if(isSub) {
        await ref.update({ subscribers: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) });
    } else {
        await ref.update({ subscribers: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) });
        // Bildirim gönder
        db.collection('notifications').add({ to: authorId, from: auth.currentUser.displayName, type: 'sub', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    alert("İşlem başarılı!"); // Sayfa yenilemeye gerek yok onSnapshot halleder
}

async function postComment(vid) {
    const input = document.getElementById('new-comment');
    if(!auth.currentUser || !input.value) return;
    await db.collection('videos').doc(vid).collection('comments').add({
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        avatar: auth.currentUser.photoURL,
        text: input.value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

async function postReply(vid, cid) {
    const input = document.getElementById(`ri-${cid}`);
    if(!auth.currentUser || !input.value) return;
    await db.collection('videos').doc(vid).collection('comments').doc(cid).collection('replies').add({
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        avatar: auth.currentUser.photoURL,
        text: input.value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
    showReplyBox(cid);
}

function showReplyBox(cid) {
    const b = document.getElementById(`rb-${cid}`);
    b.style.display = b.style.display === 'none' ? 'block' : 'none';
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'none';
    modal.innerHTML = '';
}

function shareVideo(id) {
    navigator.clipboard.writeText(window.location.href + "?v=" + id);
    alert("Link kopyalandı!");
}

async function handleLike(vid) {
    if(!auth.currentUser) return;
    await db.collection('videos').doc(vid).update({ likes: firebase.firestore.FieldValue.increment(1) });
}

// 7. VİDEO YAYINLAMA (TAMİR EDİLDİ)
async function publishVideoFromLink() {
    const url = document.getElementById('v-url')?.value || document.getElementById('youtube-url')?.value;
    const title = document.getElementById('v-title')?.value || document.getElementById('video-title')?.value;
    
    if(!url || !title || !auth.currentUser) return alert("Bilgiler eksik!");

    const videoId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    
    if(!videoId) return alert("YouTube linki hatalı!");

    await db.collection('videos').add({
        title: title,
        youtubeId: videoId,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName,
        authorAvatar: auth.currentUser.photoURL,
        views: 0,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Video paylaşıldı!");
    location.reload();
}

// Başlat
document.addEventListener('DOMContentLoaded', loadVideos);
