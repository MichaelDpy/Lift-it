// user-manager.js - Manajemen data user spesifik

class UserManager {
    constructor() {
        this.auth = auth;
    }

    // Hitung kebutuhan makro untuk user saat ini
    calculateUserMacros(userId) {
        const user = this.auth.getUserById(userId);
        if (!user) return null;

        const profil = user.data.profil;
        
        // Hitung BMR
        let bmr;
        if (profil.jenisKelamin === 'pria') {
            bmr = 88.362 + (13.397 * profil.berat) + (4.799 * profil.tinggi) - (5.677 * profil.usia);
        } else {
            bmr = 447.593 + (9.247 * profil.berat) + (3.098 * profil.tinggi) - (4.330 * profil.usia);
        }

        // Hitung TDEE
        const tdee = bmr * profil.aktivitas;

        // Sesuaikan dengan tujuan
        let targetKalori;
        switch(profil.tujuan) {
            case 'bulking':
                targetKalori = Math.round(tdee + 500);
                break;
            case 'cutting':
                targetKalori = Math.round(tdee - 500);
                break;
            default:
                targetKalori = Math.round(tdee);
        }

        // Hitung makronutrien
        const proteinGram = Math.round(profil.tujuan === 'bulking' ? profil.berat * 2 : profil.berat * 1.6);
        const proteinKalori = proteinGram * 4;

        const lemakKalori = targetKalori * 0.25;
        const lemakGram = Math.round(lemakKalori / 9);

        const karboKalori = targetKalori - proteinKalori - lemakKalori;
        const karboGram = Math.round(karboKalori / 4);

        return {
            kalori: targetKalori,
            protein: proteinGram,
            karbohidrat: karboGram,
            lemak: lemakGram,
            bmr: Math.round(bmr),
            tdee: Math.round(tdee)
        };
    }

    // Get progress data untuk chart
    getProgressDataForChart(userId, type, days = 30) {
        const user = this.auth.getUserById(userId);
        if (!user) return null;

        const progress = user.data.progress;
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        let data = [];
        let labels = [];

        switch(type) {
            case 'berat':
                const beratData = progress.berat
                    .filter(item => new Date(item.tanggal) >= cutoffDate)
                    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

                data = beratData.map(item => item.nilai);
                labels = beratData.map(item => 
                    new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                );
                break;

            case 'protein':
                // Aggregate protein harian
                const proteinMap = {};
                progress.nutrisi
                    .filter(item => new Date(item.tanggal) >= cutoffDate)
                    .forEach(item => {
                        const date = item.tanggal.split('T')[0];
                        if (!proteinMap[date]) {
                            proteinMap[date] = 0;
                        }
                        proteinMap[date] += item.protein || 0;
                    });

                const dates = Object.keys(proteinMap).sort();
                data = dates.map(date => proteinMap[date]);
                labels = dates.map(date => 
                    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                );
                break;

            case 'latihan':
                // Hitung latihan per hari
                const latihanMap = {};
                progress.latihan
                    .filter(item => new Date(item.tanggal) >= cutoffDate)
                    .forEach(item => {
                        const date = item.tanggal.split('T')[0];
                        if (!latihanMap[date]) {
                            latihanMap[date] = { count: 0, durasi: 0 };
                        }
                        latihanMap[date].count++;
                        latihanMap[date].durasi += item.durasi || 0;
                    });

                const latihanDates = Object.keys(latihanMap).sort();
                data = latihanDates.map(date => latihanMap[date].durasi / 60); // Convert to hours
                labels = latihanDates.map(date => 
                    new Date(date).toLocaleDateString('id-ID', { day: 'numeric' })
                );
                break;
        }

        return { data, labels };
    }

    // Get summary untuk dashboard
    getDashboardSummary(userId) {
        const user = this.auth.getUserById(userId);
        if (!user) return null;

        const stats = this.auth.getUserStats(userId);
        const macros = this.calculateUserMacros(userId);
        const progress = user.data.progress;

        // Hitung rata-rata 7 hari terakhir
        const last7Days = progress.nutrisi
            .filter(item => {
                const date = new Date(item.tanggal);
                const now = new Date();
                const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            });

        const avgProtein = last7Days.length > 0 ? 
            Math.round(last7Days.reduce((sum, item) => sum + (item.protein || 0), 0) / last7Days.length) : 0;

        const avgKalori = last7Days.length > 0 ? 
            Math.round(last7Days.reduce((sum, item) => sum + (item.kalori || 0), 0) / last7Days.length) : 0;

        return {
            // User info
            user: {
                nama: user.nama,
                email: user.email,
                profil: user.data.profil
            },

            // Stats
            stats: stats,

            // Macros
            macros: macros,

            // Averages
            averages: {
                protein: avgProtein,
                kalori: avgKalori,
                targetProtein: user.data.goals.targetProtein
            },

            // Today's data
            hariIni: {
                tanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
                latihan: progress.latihan.some(l => 
                    new Date(l.tanggal).toDateString() === new Date().toDateString()
                ),
                nutrisi: progress.nutrisi.find(n => 
                    new Date(n.tanggal).toDateString() === new Date().toDateString()
                ) || null
            }
        };
    }

    // Update user profile
    updateProfile(userId, newProfile) {
        const user = this.auth.getUserById(userId);
        if (!user) return false;

        user.data.profil = {
            ...user.data.profil,
            ...newProfile
        };

        return this.auth.updateUserData(userId, user);
    }

    // Update goals
    updateGoals(userId, newGoals) {
        const user = this.auth.getUserById(userId);
        if (!user) return false;

        user.data.goals = {
            ...user.data.goals,
            ...newGoals
        };

        return this.auth.updateUserData(userId, user);
    }

    // Add workout session
    addWorkoutSession(userId, workoutData) {
        return this.auth.addProgressData(userId, 'latihan', workoutData);
    }

    // Add nutrition data
    addNutritionData(userId, nutritionData) {
        return this.auth.addProgressData(userId, 'nutrisi', nutritionData);
    }

    // Add weight measurement
    addWeightMeasurement(userId, weight, catatan = '') {
        return this.auth.addProgressData(userId, 'berat', {
            nilai: weight,
            catatan: catatan
        });
    }

    // Add body measurements
    addBodyMeasurements(userId, measurements) {
        return this.auth.addProgressData(userId, 'lingkar', measurements);
    }
}

// Export instance
const userManager = new UserManager();