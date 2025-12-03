// main.js - Fungsi utama untuk website LIFTIT

// Simpan data ke localStorage (simulasi database)
function simpanData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Ambil data dari localStorage
function ambilData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Kalkulator BMR dan TDEE
function hitungKebutuhanKalori(berat, tinggi, usia, jenisKelamin, aktivitas, tujuan) {
    // Hitung BMR (Harris-Benedict)
    let bmr;
    if (jenisKelamin === 'pria') {
        bmr = 88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * usia);
    } else {
        bmr = 447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * usia);
    }
    
    // Kalikan dengan faktor aktivitas
    const tdee = bmr * aktivitas;
    
    // Sesuaikan dengan tujuan
    switch(tujuan) {
        case 'bulking':
            return tdee + 500; // Surplus 500 kalori
        case 'cutting':
            return tdee - 500; // Defisit 500 kalori
        default:
            return tdee; // Maintenance
    }
}

// Hitung kebutuhan makronutrien
function hitungMakronutrien(kalori, berat, tujuan) {
    // Protein: 2g per kg berat badan untuk bulking
    const proteinGram = tujuan === 'bulking' ? berat * 2 : berat * 1.6;
    const proteinKalori = proteinGram * 4;
    
    // Lemak: 25-30% dari total kalori
    const lemakKalori = kalori * 0.25;
    const lemakGram = lemakKalori / 9;
    
    // Karbohidrat: sisa kalori
    const karboKalori = kalori - proteinKalori - lemakKalori;
    const karboGram = karboKalori / 4;
    
    return {
        protein: Math.round(proteinGram),
        lemak: Math.round(lemakGram),
        karbohidrat: Math.round(karboGram),
        kalori: Math.round(kalori)
    };
}

// Format tanggal Indonesia
function formatTanggal(tanggal) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return tanggal.toLocaleDateString('id-ID', options);
}

// Validasi email
function validasiEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validasi password
function validasiPassword(password) {
    return password.length >= 8;
}

// Hitung progress percentage
function hitungProgress(nilaiSekarang, nilaiTarget) {
    return Math.min(Math.round((nilaiSekarang / nilaiTarget) * 100), 100);
}

// Generate ID unik
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format angka dengan titik
function formatAngka(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Export fungsi agar bisa digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        simpanData,
        ambilData,
        hitungKebutuhanKalori,
        hitungMakronutrien,
        formatTanggal,
        validasiEmail,
        validasiPassword,
        hitungProgress,
        generateId,
        formatAngka
    };
}