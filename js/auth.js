// auth.js - Sistem autentikasi dan manajemen user

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('liftit_users')) || [];
        this.initializeSession();
    }

    // Inisialisasi session dari localStorage
    initializeSession() {
        const savedUser = localStorage.getItem('liftit_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    // Daftar user baru
    register(userData) {
        // Validasi data
        if (!userData.email || !userData.password || !userData.nama) {
            return { success: false, message: 'Harap isi semua data!' };
        }

        // Cek apakah email sudah terdaftar
        if (this.users.some(user => user.email === userData.email)) {
            return { success: false, message: 'Email sudah terdaftar!' };
        }

        // Validasi password
        if (userData.password.length < 8) {
            return { success: false, message: 'Password minimal 8 karakter!' };
        }

        // Buat user baru dengan data awal
        const newUser = {
            id: this.generateUserId(),
            email: userData.email,
            password: userData.password, // Dalam produksi, gunakan hash!
            nama: userData.nama,
            tanggalDaftar: new Date().toISOString(),
            data: {
                // Data fisik
                profil: {
                    berat: userData.berat || 70,
                    tinggi: userData.tinggi || 170,
                    usia: userData.usia || 25,
                    jenisKelamin: userData.jenisKelamin || 'pria',
                    aktivitas: userData.aktivitas || 1.375,
                    tujuan: userData.tujuan || 'bulking'
                },
                
                // Progress tracking
                progress: {
                    berat: [],
                    lingkar: {
                        lengan: [],
                        dada: [],
                        paha: []
                    },
                    latihan: [],
                    nutrisi: []
                },
                
                // Goals
                goals: {
                    targetBerat: userData.targetBerat || 75,
                    targetProtein: userData.berat ? userData.berat * 2 : 140,
                    latihanPerMinggu: 4
                },
                
                // Settings
                settings: {
                    notifikasi: true,
                    tema: 'dark',
                    satuan: 'metric'
                }
            }
        };

        // Tambahkan ke database
        this.users.push(newUser);
        this.saveUsers();

        // Login otomatis setelah registrasi
        return this.login(userData.email, userData.password);
    }

    // Login user
    login(email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return { success: false, message: 'Email atau password salah!' };
        }

        // Set current user
        this.currentUser = user;
        localStorage.setItem('liftit_current_user', JSON.stringify(user));

        return { 
            success: true, 
            message: 'Login berhasil!',
            user: user 
        };
    }

    // Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem('liftit_current_user');
        return { success: true, message: 'Logout berhasil!' };
    }

    // Update user data
    updateUserData(userId, newData) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return false;

        // Update data
        this.users[userIndex] = {
            ...this.users[userIndex],
            ...newData
        };

        // Update current user jika sama
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser = this.users[userIndex];
            localStorage.setItem('liftit_current_user', JSON.stringify(this.currentUser));
        }

        this.saveUsers();
        return true;
    }

    // Tambah progress data
    addProgressData(userId, type, data) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return false;

        const timestamp = new Date().toISOString();
        
        switch(type) {
            case 'berat':
                user.data.progress.berat.push({
                    tanggal: timestamp,
                    nilai: data.nilai,
                    catatan: data.catatan || ''
                });
                break;

            case 'lingkar':
                if (data.lengan) {
                    user.data.progress.lingkar.lengan.push({
                        tanggal: timestamp,
                        nilai: data.lengan
                    });
                }
                if (data.dada) {
                    user.data.progress.lingkar.dada.push({
                        tanggal: timestamp,
                        nilai: data.dada
                    });
                }
                if (data.paha) {
                    user.data.progress.lingkar.paha.push({
                        tanggal: timestamp,
                        nilai: data.paha
                    });
                }
                break;

            case 'latihan':
                user.data.progress.latihan.push({
                    tanggal: timestamp,
                    jenis: data.jenis,
                    durasi: data.durasi,
                    kalori: data.kalori || 0
                });
                break;

            case 'nutrisi':
                user.data.progress.nutrisi.push({
                    tanggal: timestamp,
                    kalori: data.kalori || 0,
                    protein: data.protein || 0,
                    karbohidrat: data.karbo || 0,
                    lemak: data.lemak || 0
                });
                break;
        }

        return this.updateUserData(userId, user);
    }

    // Get progress stats untuk user
    getUserStats(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return null;

        const progress = user.data.progress;
        const goals = user.data.goals;
        
        // Hitung statistik
        const stats = {
            // Data terkini
            beratTerakhir: progress.berat.length > 0 ? progress.berat[progress.berat.length - 1].nilai : user.data.profil.berat,
            beratAwal: progress.berat.length > 0 ? progress.berat[0].nilai : user.data.profil.berat,
            
            // Progress
            progressBerat: progress.berat.length > 1 ? 
                ((progress.berat[progress.berat.length - 1].nilai - progress.berat[0].nilai) / progress.berat[0].nilai * 100).toFixed(1) : 0,
            
            // Rata-rata mingguan
            latihanMingguIni: progress.latihan.filter(l => {
                const date = new Date(l.tanggal);
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            }).length,
            
            // Target progress
            targetProgress: ((progress.berat.length > 0 ? progress.berat[progress.berat.length - 1].nilai : user.data.profil.berat) / goals.targetBerat * 100).toFixed(1),
            
            // Streak
            streakHari: this.calculateStreak(progress.latihan),
            
            // Total
            totalLatihan: progress.latihan.length,
            totalHari: new Set(progress.latihan.map(l => l.tanggal.split('T')[0])).size
        };

        return stats;
    }

    // Hitung streak latihan
    calculateStreak(latihanData) {
        if (latihanData.length === 0) return 0;
        
        const dates = latihanData.map(l => new Date(l.tanggal).toDateString());
        const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        let currentDate = new Date();
        
        for (let dateStr of uniqueDates) {
            const workoutDate = new Date(dateStr);
            const diffDays = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === streak) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('liftit_users', JSON.stringify(this.users));
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user by ID
    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    }
}

// Export instance
const auth = new AuthSystem();