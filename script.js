/**
 * BHminations - Ultimate YouTube Klonu
 * Kurucu: Alper (bluehairkomsi@gmail.com)
 */

// ======== FIREBASE YAPILANDIRMASI ========
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

// ======== GLOBAL DEĞIŞKENLER ========
let currentUser = null;
let currentPage = 'home';
let currentVideo = null;
let allVideos = [];
let userLikes = [];
let userSubscriptions = [];
let shortsIndex = 0;
let filter = 'all';
let currentFileUpload = null;

// ======== SAYIFA KONTROLÜ ========
function goToPage(page) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Modallari kapat
    closeVideoModal();
    closeUploadModal();

    // Aktif sayfa elemanini bul ve göster
    const pageElement = document.getElementById(page + '-page');
    if (pageElement) {
        pageElement.style.display = 'block';
        currentPage = page;
    }

    // Sidebar aktif elamani güncelle
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('a')?.classList.add('active');
    }

    // Sayfaya özel işlemler
    if (page === 'home') {
        loadVideos();
    } else if (page === 'shorts') {
        loadShorts();
    } else if (page === 'trends') {
        loadTrends();
    } else if (page === 'liked') {
        loadLikedVideos();
    } else if (page === 'mychannel') {
        loadMyChannel();
    } else if (page === 'subscribers') {
        loadMySubscribers();
    } else if (page === 'subscriptions') {
        loadMySubscriptions();
    } else if (page === 'settings') {
        loadProfileSettings();
    } else if (page === 'admin') {
        if (currentUser?.email === 'bluehairkomsi@gmail.com') {
            loadAdminPanel();
        } else {
            goToPage('home');
            alert('Yalnızca Kurucu bu sayfaya erişebilir');
        }
    }

    // Mobilde sidebar'ı kapat
    if (window.innerWidth < 768) {
        toggleSidebar();
    }
}

// ======== SIDEBAR TOGGLE ========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar').parentElement;
    sidebar.classList.toggle('active');
}

// ======== TEMA DEĞIŞTIRME ========
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// Tema yükle
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// ======== AUTHENTICATION ========
function googleLogin() {
    auth.signInWithPopup(provider)
        .then(result => {
            currentUser = result.user;
            updateUI();
            loadUserData();
        })
        .catch(error => alert("Giriş Hatası: " + error.message));
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        updateUI();
        goToPage('home');
    });
}

// Auth durumunun değişmesini dinle
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    if (user) {
        loadUserData();
        loadVideos();
    }
});

// UI'ı kullanıcı durumuna göre güncelle
function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const uploadMobileBtn = document.getElementById('upload-mobile-btn');
    const notificationsBtn = document.getElementById('notifications-btn');
    const adminItem = document.getElementById('admin-menu-item');
    const adminSep = document.getElementById('admin-sep');
    const editChannelBtn = document.getElementById('edit-channel-btn');
    const subscriptionsSection = document.getElementById('subscriptions-section');

    if (currentUser) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        uploadMobileBtn.style.display = 'flex';
        notificationsBtn.style.display = 'flex';

        document.getElementById('u-img').src = currentUser.photoURL;
        document.getElementById('u-name').innerText = currentUser.displayName;

        if (currentUser.email === 'bluehairkomsi@gmail.com') {
            adminItem.style.display = 'flex';
            adminSep.style.display = 'block';
        }

        subscriptionsSection.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        userMenu.style.display = 'none';
        uploadMobileBtn.style.display = 'none';
        notificationsBtn.style.display = 'none';
        subscriptionsSection.style.display = 'none';
        adminItem.style.display = 'none';
        adminSep.style.display = 'none';
    }
}

// ======== VİDEO YÜKLEME (YOUTUBE LİNKİ) ========
async function publishVideoFromLink() {
    if (!currentUser) return alert('Lütfen önce giriş yapın');

    const title = document.getElementById('v-title').value.trim();
    const url = document.getElementById('v-url').value.trim();
    const description = document.getElementById('v-description').value.trim();
    const category = document.getElementById('v-category').value;

    if (!title || !url) return alert("Başlık ve YouTube linki gerekli!");

    let videoId = '';
    try {
        videoId = url.includes('youtu.be') 
            ? url.split('/').pop().split('?')[0]
            : url.split('v=')[1]?.split('&')[0];
        
        if (!videoId) throw new Error('Geçersiz link');
    } catch (e) {
        return alert("Geçersiz YouTube linki!");
    }

    try {
        await db.collection("videos").add({
            title: title,
            description: description,
            videoId: videoId,
            videoUrl: null,
            author: currentUser.displayName,
            authorEmail: currentUser.email,
            authorUID: currentUser.uid,
            authorAvatar: currentUser.photoURL,
            category: category || 'general',
            isVerified: currentUser.email === 'bluehairkomsi@gmail.com',
            likes: 0,
            views: 0,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isShorts: false
        });

        alert("Video başarıyla paylaşıldı! 🚀");
        document.getElementById('v-title').value = "";
        document.getElementById('v-url').value = "";
        document.getElementById('v-description').value = "";
        closeUploadModal();
        loadVideos();
    } catch (err) {
        console.error(err);
        alert("Video yüklenirken hata oluştu: " + err.message);
    }
}

// ======== VİDEO YÜKLEME (DOSYA) ========
let selectedFile = null;

function handleFileSelect() {
    selectedFile = document.getElementById('file-input').files[0];
    if (selectedFile) {
        document.getElementById('file-info').style.display = 'block';
        document.getElementById('file-name').textContent = selectedFile.name;
        document.getElementById('publish-file-btn').style.display = 'block';
    }
}

async function publishVideoFromFile() {
    if (!currentUser) return alert('Lütfen önce giriş yapın');
    if (!selectedFile) return alert('Lütfen video dosyası seçin');

    const title = document.getElementById('file-title').value.trim();
    const description = document.getElementById('file-description').value.trim();
    const thumbnail = document.getElementById('file-thumbnail').value.trim();
    const category = document.getElementById('file-category').value;

    if (!title) return alert("Video başlığı gerekli!");

    const fileRef = storage.ref('videos/' + currentUser.uid + '/' + selectedFile.name);
    
    try {
        const uploadTask = fileRef.put(selectedFile);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('upload-progress').style.width = progress + '%';
            },
            (error) => {
                alert("Yükleme hatası: " + error.message);
            },
            async () => {
                const videoUrl = await fileRef.getDownloadURL();
                
                await db.collection("videos").add({
                    title: title,
                    description: description,
                    videoId: null,
                    videoUrl: videoUrl,
                    author: currentUser.displayName,
                    authorEmail: currentUser.email,
                    authorUID: currentUser.uid,
                    authorAvatar: currentUser.photoURL,
                    category: category || 'general',
                    isVerified: currentUser.email === 'bluehairkomsi@gmail.com',
                    thumbnail: thumbnail || null,
                    likes: 0,
                    views: 0,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isShorts: false
                });

                alert("Video başarıyla yüklendi! 🚀");
                document.getElementById('file-title').value = "";
                document.getElementById('file-description').value = "";
                document.getElementById('file-thumbnail').value = "";
                document.getElementById('file-input').value = "";
                selectedFile = null;
                closeUploadModal();
                loadVideos();
            }
        );
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

// ======== MODAL KONTROLÜ ========
function openUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
}

function switchUploadTab(tab) {
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    
    document.querySelectorAll('.upload-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// ======== VİDEO TÜM LİSTESİNİ YÜKLE ========
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    db.collection("videos")
        .where('isShorts', '==', false)
        .orderBy('uploadedAt', 'desc')
        .onSnapshot(snapshot => {
            allVideos = [];
            grid.innerHTML = '';
            
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                allVideos.push(video);
                createVideoCard(video, grid);
            });
        });
}

function createVideoCard(video, container) {
    const card = document.createElement('a');
    card.className = 'v-card';
    card.href = '#';
    card.onclick = (e) => {
        e.preventDefault();
        openVideoModal(video);
    };

    const thumbnail = video.videoId 
        ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
        : video.thumbnail || 'https://via.placeholder.com/280x157?text=No+Image';

    card.innerHTML = `
        <div class="v-card-thumbnail">
            <img src="${thumbnail}" style="width:100%; height:100%; object-fit:cover;">
            <span style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.8); color:white; padding:4px 8px; border-radius:2px; font-size:12px; font-weight:bold;">
                10:45
            </span>
        </div>
        <div class="v-card-info">
            <img src="${video.authorAvatar}" class="v-card-avatar">
            <div class="v-card-details">
                <div class="v-card-title">
                    ${video.title}
                    ${video.isVerified ? '<span class="verified-badge">✔</span>' : ''}
                </div>
                <div class="v-card-author">${video.author}</div>
                <div class="v-card-meta">${video.views || 0} izlenme • 2 gün önce</div>
            </div>
        </div>
    `;

    container.appendChild(card);
}

// ======== VİDEO DETAY MODAL ========
function openVideoModal(video) {
    currentVideo = video;
    const modal = document.getElementById('video-modal');
    
    document.getElementById('detail-player').src = video.videoId 
        ? `https://www.youtube.com/embed/${video.videoId}`
        : `<div style='width:100%; height:100%; background:#000; display:flex; align-items:center; justify-content:center; color:white;'>
             <p>Video oynatıcı yükleniyor...</p>
           </div>`;

    document.getElementById('detail-title').textContent = video.title;
    document.getElementById('detail-views').textContent = (video.views || 0) + ' izlenme';
    document.getElementById('detail-date').textContent = '2 gün önce';
    document.getElementById('detail-author').textContent = video.author;
    document.getElementById('detail-avatar').src = video.authorAvatar;
    document.getElementById('detail-description').textContent = video.description || 'Açıklama bulunamadı';
    document.getElementById('like-count').textContent = video.likes || 0;

    // Abone durumunu kontrol et
    updateSubscribeButton();

    // Yorumları yükle
    loadComments(video.id);

    // Sıradaki videoları yükle
    loadNextVideos(video.id);

    modal.classList.add('active');
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.remove('active');
    currentVideo = null;
}

// ======== LIKE/DISLIKE SİSTEMİ ========
async function likeVideo() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');

    try {
        const docRef = db.collection('videos').doc(currentVideo.id);
        const userLikeRef = db.collection('videoLikes').where('videoId', '==', currentVideo.id)
            .where('userId', '==', currentUser.uid);

        const likeSnapshot = await userLikeRef.get();

        if (likeSnapshot.empty) {
            // Like ekle
            await docRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
            await db.collection('videoLikes').add({
                videoId: currentVideo.id,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('like-count').textContent = (currentVideo.likes || 0) + 1;
        } else {
            // Like kaldır
            likeSnapshot.forEach(doc => doc.ref.delete());
            await docRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
            document.getElementById('like-count').textContent = Math.max(0, (currentVideo.likes || 0) - 1);
        }
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

function dislikeVideo() {
    if (!currentUser) return alert('Lütfen giriş yapın');
    alert("Beğenmeme geçici olarak devre dışı");
}

// ======== PAYLAŞ ========
function shareVideo() {
    if (!currentVideo) return;
    const url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        alert("Link kopyalandı!");
    } else {
        alert("Video Linki: " + url);
    }
}

function saveToPlaylist() {
    alert("Çalma listesi özellikleri yakında gelecek!");
}

// ======== YORUM SİSTEMİ ========
async function loadComments(videoId) {
    const commentsList = document.getElementById('comments-list');
    const commentInputArea = document.getElementById('comment-input-area');

    commentsList.innerHTML = '';

    // Yorum girişi
    if (currentUser) {
        commentInputArea.innerHTML = `
            <div class="comment-item" style="margin-bottom:20px;">
                <img src="${currentUser.photoURL}" class="comment-avatar">
                <div style="flex:1;">
                    <textarea id="new-comment-text" placeholder="Yorum yaz..." style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:4px; resize:vertical; min-height:60px; font-family:Roboto;"></textarea>
                    <div style="margin-top:8px; display:flex; gap:8px;">
                        <button class="btn-primary" style="padding:6px 16px; font-size:13px;" onclick="postComment('${videoId}')">Gönder</button>
                        <button style="padding:6px 16px; border:1px solid var(--border-color); background:none; cursor:pointer; border-radius:4px;" onclick="document.getElementById('new-comment-text').value=''">İptal</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Yorumları yükle
    const commentsSnapshot = await db.collection('comments')
        .where('videoId', '==', videoId)
        .orderBy('timestamp', 'desc')
        .get();

    commentsSnapshot.forEach(doc => {
        const comment = doc.data();
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.innerHTML = `
            <img src="${comment.userAvatar}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-author">${comment.userName}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <span onclick="likeComment('${doc.id}')">👍 ${comment.likes || 0}</span>
                    <span onclick="replyComment('${doc.id}')">Yanıtla</span>
                </div>
            </div>
        `;
        commentsList.appendChild(commentEl);
    });
}

async function postComment(videoId) {
    if (!currentUser) return alert('Lütfen giriş yapın');
    
    const text = document.getElementById('new-comment-text').value.trim();
    if (!text) return alert('Yorum yazın');

    try {
        await db.collection('comments').add({
            videoId: videoId,
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userAvatar: currentUser.photoURL,
            text: text,
            likes: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('new-comment-text').value = '';
        if (currentVideo) {
            loadComments(currentVideo.id);
        }
    } catch (err) {
        alert("Yorum yazarken hata: " + err.message);
    }
}

function likeComment(commentId) {
    alert("Yorum beğenme yakında gelecek!");
}

function replyComment(commentId) {
    alert("Yanıt yazma yakında gelecek!");
}

// ======== SHORTS SİSTEMİ ========
function loadShorts() {
    db.collection('videos')
        .where('isShorts', '==', true)
        .orderBy('uploadedAt', 'desc')
        .get()
        .then(snapshot => {
            const shorts = [];
            snapshot.forEach(doc => {
                shorts.push({ id: doc.id, ...doc.data() });
            });
            
            if (shorts.length > 0) {
                shortsIndex = 0;
                displayShort(shorts[shortsIndex]);
            } else {
                document.getElementById('shorts-viewer').innerHTML = '<p style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Henüz Short yok</p>';
            }
        });
}

function displayShort(short) {
    document.getElementById('shorts-iframe').src = short.videoId 
        ? `https://www.youtube.com/embed/${short.videoId}`
        : short.videoUrl;
    
    document.getElementById('shorts-title').textContent = short.title;
    document.getElementById('shorts-description').textContent = short.description || '';
    document.getElementById('shorts-author').textContent = short.author;
    document.getElementById('shorts-avatar').src = short.authorAvatar;
    document.getElementById('short-likes').textContent = short.likes || 0;
}

function nextShort() {
    shortsIndex++;
    alert("Shorts geçişi yakında optimize edilecek");
}

function prevShort() {
    shortsIndex = Math.max(0, shortsIndex - 1);
    alert("Shorts geçişi yakında optimize edilecek");
}

function likeShort() {
    alert("Short beğenme yakında gelecek!");
}

function dislikeShort() {
    alert("Short beğenmeme yakında gelecek!");
}

function shareShort() {
    alert("Short paylaşma yakında gelecek!");
}

// ======== TRENDLERİ SAYFASI ========
function loadTrends() {
    const trendsGrid = document.getElementById('trends-grid');
    trendsGrid.innerHTML = '';

    db.collection('videos')
        .where('isShorts', '==', false)
        .orderBy('views', 'desc')
        .limit(12)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                createVideoCard(video, trendsGrid);
            });
        });
}

// ======== BEĞENİLEN VİDEOLAR ========
function loadLikedVideos() {
    if (!currentUser) return alert('Lütfen giriş yapın');

    const likedGrid = document.getElementById('liked-grid');
    likedGrid.innerHTML = '';

    db.collection('videoLikes')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            const likedVideoIds = snapshot.docs.map(doc => doc.data().videoId);
            
            if (likedVideoIds.length === 0) {
                likedGrid.innerHTML = '<p>Henüz beğendiğiniz video yok</p>';
                return;
            }

            db.collection('videos')
                .where(firebase.firestore.FieldPath.documentId(), 'in', likedVideoIds)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        const video = { id: doc.id, ...doc.data() };
                        createVideoCard(video, likedGrid);
                    });
                });
        });
}

// ======== KANAL SAYFASI ========
async function loadMyChannel() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    // Kullanıcı ayarlarını Firestore'dan yükle
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userDocRef.get();
    let userData = userDoc.data() || {};

    document.getElementById('channel-name').textContent = userData.displayName || currentUser.displayName;
    document.getElementById('channel-avatar').src = userData.avatar || currentUser.photoURL;
    document.getElementById('channel-bio-text').textContent = userData.bio || '';
    document.getElementById('edit-channel-btn').style.display = 'block';
    document.getElementById('my-subscribers-btn').style.display = 'block';
    document.getElementById('my-subscriptions-btn').style.display = 'block';

    // Abone sayısını yükle
    const subSnapshot = await db.collection('subscriptions')
        .where('channelId', '==', currentUser.uid)
        .get();
    document.getElementById('channel-subscribers').textContent = subSnapshot.size + ' abone';

    // Kanalın videolarını yükle
    const videosGrid = document.getElementById('channel-videos');
    videosGrid.innerHTML = '';

    db.collection('videos')
        .where('authorEmail', '==', currentUser.email)
        .orderBy('uploadedAt', 'desc')
        .onSnapshot(snapshot => {
            videosGrid.innerHTML = '';
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                createVideoCard(video, videosGrid);
            });
        });
}

function editChannel() {
    alert("Kanal düzenleme özelliği yakında gelecek!");
}

function switchChannelTab(tab) {
    // Tab geçişi
}

// ======== PROFIL AYARLARI ========
async function loadProfileSettings() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    // Kullanıcı ayarlarını yükle
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userDocRef.get();
    let userData = userDoc.data() || {};

    document.getElementById('settings-avatar').src = userData.avatar || currentUser.photoURL;
    document.getElementById('channel-display-name').value = userData.displayName || currentUser.displayName;
    document.getElementById('channel-bio').value = userData.bio || '';
    document.getElementById('social-youtube').value = userData.socialYoutube || '';
    document.getElementById('social-instagram').value = userData.socialInstagram || '';
    document.getElementById('social-website').value = userData.socialWebsite || '';

    // Banner'ı göster
    if (userData.banner) {
        document.getElementById('channel-banner').style.backgroundImage = `url(${userData.banner})`;
        document.getElementById('channel-banner').style.backgroundSize = 'cover';
        document.getElementById('channel-banner').textContent = '';
    }
}

async function saveProfileSettings() {
    if (!currentUser) return alert('Lütfen giriş yapın');

    const displayName = document.getElementById('channel-display-name').value.trim();
    const bio = document.getElementById('channel-bio').value.trim();
    const socialYoutube = document.getElementById('social-youtube').value.trim();
    const socialInstagram = document.getElementById('social-instagram').value.trim();
    const socialWebsite = document.getElementById('social-website').value.trim();

    if (!displayName) return alert('Kanal adı gerekli!');

    try {
        await db.collection('users').doc(currentUser.uid).set({
            displayName: displayName,
            bio: bio,
            socialYoutube: socialYoutube,
            socialInstagram: socialInstagram,
            socialWebsite: socialWebsite,
            avatar: currentUser.photoURL,
            email: currentUser.email
        }, { merge: true });

        alert('Profil ayarları kaydedildi! 🎉');
        goToPage('mychannel');
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

async function changeAvatar() {
    const file = document.getElementById('avatar-input').files[0];
    if (!file || !currentUser) return;

    const fileRef = storage.ref('avatars/' + currentUser.uid);
    try {
        await fileRef.put(file);
        const avatarUrl = await fileRef.getDownloadURL();
        
        await db.collection('users').doc(currentUser.uid).update({
            avatar: avatarUrl
        });

        document.getElementById('settings-avatar').src = avatarUrl;
        document.getElementById('u-img').src = avatarUrl;
        alert('Profil resmi güncellendi! ✅');
    } catch (err) {
        alert('Yükleme hatası: ' + err.message);
    }
}

async function changeBanner() {
    const file = document.getElementById('banner-input').files[0];
    if (!file || !currentUser) return;

    const fileRef = storage.ref('banners/' + currentUser.uid);
    try {
        await fileRef.put(file);
        const bannerUrl = await fileRef.getDownloadURL();
        
        await db.collection('users').doc(currentUser.uid).update({
            banner: bannerUrl
        });

        const banner = document.getElementById('channel-banner');
        banner.style.backgroundImage = `url(${bannerUrl})`;
        banner.style.backgroundSize = 'cover';
        banner.textContent = '';
        alert('Başlık fotoğrafı güncellendi! ✅');
    } catch (err) {
        alert('Yükleme hatası: ' + err.message);
    }
}

// ======== ABONELERİM SAYFASI ========
async function loadMySubscribers() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    const subscribersList = document.getElementById('subscribers-list');
    subscribersList.innerHTML = '';

    try {
        const subSnapshot = await db.collection('subscriptions')
            .where('channelId', '==', currentUser.uid)
            .get();

        document.getElementById('subscriber-count-text').textContent = subSnapshot.size + ' abone';

        for (const doc of subSnapshot.docs) {
            const sub = doc.data();
            
            // Abone bilgisini yükle
            const userDocRef = db.collection('users').doc(sub.subscriberId);
            const userDoc = await userDocRef.get();
            const userData = userDoc.data() || {};

            const card = document.createElement('div');
            card.className = 'subscriber-card';
            card.innerHTML = `
                <img src="${userData.avatar || 'https://via.placeholder.com/80?text=Avatar'}" class="subscriber-avatar">
                <div class="subscriber-name">${userData.displayName || 'Anonım Kullanıcı'}</div>
                <div class="subscriber-email">${userData.email}</div>
                <div class="subscriber-actions">
                    <button onclick="removeSubscriber('${doc.id}')">Çıkar</button>
                </div>
            `;
            subscribersList.appendChild(card);
        }

        if (subSnapshot.empty) {
            subscribersList.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Henüz aboneniz yok</p>';
        }
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

async function removeSubscriber(subscriptionId) {
    if (!confirm('Bu aboneyi çıkarmak istediğine emin misin?')) return;

    try {
        await db.collection('subscriptions').doc(subscriptionId).delete();
        loadMySubscribers();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

// ======== ABONELİKLERİ SAYFASI ========
async function loadMySubscriptions() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    const grid = document.getElementById('subscriptions-videos-list');
    const container = document.querySelector('.subscriptions-container');
    
    // Önceki kanal başlıklarını temizle
    container.querySelectorAll('.subscription-channel-header').forEach(el => el.remove());
    grid.innerHTML = '';

    try {
        const subSnapshot = await db.collection('subscriptions')
            .where('subscriberId', '==', currentUser.uid)
            .get();

        if (subSnapshot.empty) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:40px;">Henüz kimseye abone olmadınız</p>';
            return;
        }

        for (const doc of subSnapshot.docs) {
            const sub = doc.data();
            
            // Abone olunan kanal bilgisini yükle (uid'ye göre)
            const userDocRef = db.collection('users').doc(sub.channelId);
            const userDoc = await userDocRef.get();
            const userData = userDoc.data() || {};

            // Kanal başlığını göster
            const channelHeader = document.createElement('div');
            channelHeader.className = 'subscription-channel-header';
            channelHeader.onclick = () => {
                alert('Başka kullanıcı kanalı görüntüleme yakında gelecek!');
            };
            channelHeader.innerHTML = `
                <img src="${userData.avatar || 'https://via.placeholder.com/80?text=Avatar'}" class="subscription-channel-avatar">
                <div class="subscription-channel-info">
                    <div class="subscription-channel-name">${userData.displayName || 'Anonım'}</div>
                    <div class="subscription-channel-email">${userData.email}</div>
                </div>
                <button class="subscription-unsubscribe-btn" onclick="event.stopPropagation(); unsubscribeFrom('${doc.id}')">Abonelikten Çık</button>
            `;
            container.appendChild(channelHeader);

            // Bu kanalın videolarını yükle (email'e göre)
            const videosSnapshot = await db.collection('videos')
                .where('authorEmail', '==', userData.email)
                .where('isShorts', '==', false)
                .orderBy('uploadedAt', 'desc')
                .limit(4)
                .get();

            videosSnapshot.forEach(videoDoc => {
                const video = { id: videoDoc.id, ...videoDoc.data() };
                createVideoCard(video, grid);
            });
        }
    } catch (err) {
        console.error(err);
        alert('Hata: ' + err.message);
    }
}

async function unsubscribeFrom(subscriptionId) {
    if (!confirm('Bu kanaldan abone olmaktan çıkmak istediğine emin misin?')) return;

    try {
        await db.collection('subscriptions').doc(subscriptionId).delete();
        alert('Abonelik kaldırıldı!');
        loadMySubscriptions();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

// ======== ABONE SİSTEMİ ========
async function toggleDetailSubscribe() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');

    const subscriptionRef = db.collection('subscriptions')
        .where('subscriberId', '==', currentUser.uid)
        .where('channelId', '==', currentVideo.authorUID);

    const snapshot = await subscriptionRef.get();

    try {
        if (snapshot.empty) {
            // Abone ol
            await db.collection('subscriptions').add({
                subscriberId: currentUser.uid,
                channelId: currentVideo.authorUID,
                channelName: currentVideo.author,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('detail-subscribe-btn').textContent = 'Aboneliği Kaldır';
            alert("Abone olundu!");
        } else {
            // Aboneliği kaldır
            snapshot.forEach(doc => doc.ref.delete());
            document.getElementById('detail-subscribe-btn').textContent = 'Abone Ol';
            alert("Abonelik kaldırıldı!");
        }
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

function toggleSubscribe() {
    toggleDetailSubscribe();
}

// ======== KULLANICI VERİLERİNİ YÜKLE ========
function loadUserData() {
    if (!currentUser) return;

    // Abonelikleri yükle
    db.collection('subscriptions')
        .where('subscriberId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            const subList = document.getElementById('subscriptions-list');
            subList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const sub = doc.data();
                const subItem = document.createElement('a');
                subItem.href = '#';
                subItem.className = 'sidebar-item';
                subItem.textContent = sub.channelName;
                subItem.onclick = (e) => {
                    e.preventDefault();
                };
                subList.appendChild(subItem);
            });
        });

    // Beğenileri yükle
    db.collection('videoLikes')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            userLikes = snapshot.docs.map(doc => doc.data().videoId);
        });
}

// ======== KATEGORİ FİLTRESİ ========
function filterCategory(category) {
    filter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';

    let query = db.collection('videos').where('isShorts', '==', false);
    
    if (category !== 'all') {
        query = query.where('category', '==', category);
    }

    query.orderBy('uploadedAt', 'desc').get().then(snapshot => {
        snapshot.forEach(doc => {
            const video = { id: doc.id, ...doc.data() };
            createVideoCard(video, grid);
        });
    });
}

// ======== ARAMA FONKSİYONU ========
function searchVideos() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (!searchTerm) return loadVideos();

    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';

    db.collection('videos')
        .where('isShorts', '==', false)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                if (video.title.toLowerCase().includes(searchTerm) ||
                    video.author.toLowerCase().includes(searchTerm)) {
                    createVideoCard(video, grid);
                }
            });
        });
}

// ======== SIRAKIN VİDEOLARI ========
function loadNextVideos(currentVideoId) {
    const nextList = document.getElementById('next-videos-list');
    nextList.innerHTML = '';

    db.collection('videos')
        .where('isShorts', '==', false)
        .orderBy('uploadedAt', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                if (doc.id !== currentVideoId) {
                    const video = { id: doc.id, ...doc.data() };
                    const nextItem = document.createElement('div');
                    nextItem.className = 'next-video-item';
                    nextItem.onclick = () => {
                        openVideoModal(video);
                    };
                    nextItem.innerHTML = `
                        <img src="https://img.youtube.com/vi/${video.videoId || 'default'}/default.jpg" class="next-video-thumbnail" onerror="this.src='https://via.placeholder.com/100x60?text=No+Image'">
                        <div class="next-video-info">
                            <div class="next-video-title">${video.title}</div>
                            <div class="next-video-author">${video.author}</div>
                        </div>
                    `;
                    nextList.appendChild(nextItem);
                }
            });
        });
}

// ======== KURUCU PANELİ ========
async function loadAdminPanel() {
    if (currentUser?.email !== 'bluehairkomsi@gmail.com') return;

    const adminVideosList = document.getElementById('admin-videos-list');
    adminVideosList.innerHTML = '';

    const videosSnapshot = await db.collection('videos').get();
    
    videosSnapshot.forEach(doc => {
        const video = doc.data();
        const item = document.createElement('div');
        item.style.cssText = 'padding:12px; border:1px solid var(--border-color); border-radius:4px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `
            <div>
                <strong>${video.title}</strong>
                <p style="margin:4px 0; font-size:12px; color:var(--secondary-text);">Yükleyen: ${video.author}</p>
            </div>
            <button class="btn-danger" style="padding:6px 12px;" onclick="deleteVideo('${doc.id}')">Sil</button>
        `;
        adminVideosList.appendChild(item);
    });
}

async function deleteVideo(videoId) {
    if (!confirm('Bu videoyu silmek istediğine emin misin?')) return;

    try {
        await db.collection('videos').doc(videoId).delete();
        alert('Video silindi');
        loadAdminPanel();
    } catch (err) {
        alert('Silme hatası: ' + err.message);
    }
}

async function adminVerify() {
    const email = document.getElementById('admin-target-email').value.trim();
    if (!email) return alert('E-posta girin');

    alert(email + " kullanıcısına mavi tik verme özelliği yakında gelecek!");
}

async function adminBan() {
    const email = document.getElementById('admin-target-email').value.trim();
    if (!email) return alert('E-posta girin');

    alert(email + " kullanıcısı ban listesine eklendi!");
}

// ======== BAŞLANGIÇ ========
function showNotifications() {
    alert("Bildirim paneli yakında gelecek!");
}

// Enter tuşu ile arama
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });

    // İlk yükleme
    loadVideos();
});
