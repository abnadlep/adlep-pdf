const express = require('express');
const jsonServer = require('json-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const SECRET_KEY = 'fantasy_novels_secret_key_2023';
const ADMIN_EMAIL = 'esraaaaa@gmail.com';
const ADMIN_PASSWORD = 'mhamdzreik1234';

// تهيئة قاعدة البيانات إذا لم تكن موجودة
if (!fs.existsSync('db.json')) {
    const initialData = {
        users: [
            {
                id: 1,
                name: "المدير",
                email: ADMIN_EMAIL,
                password: bcrypt.hashSync(ADMIN_PASSWORD, 10),
                role: "admin",
                avatar: "https://i.pravatar.cc/150?img=1",
                bio: "مدير تطبيق روايات الفانتازيا",
                joinDate: "2023-01-01"
            }
        ],
        novels: [
            {
                id: 1,
                title: "ملكة الظلال",
                author: "أحمد الساحر",
                description: "رواية فانتازيا مظلمة عن مملكة تسيطر عليها قوى الظلام، وشابة تمتلك قدرة على التحكم بالظلال.",
                genre: "فانتازيا مظلمة",
                coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                pdfUrl: "https://example.com/novels/shadow-queen.pdf",
                chapters: 24,
                pages: 320,
                rating: 4.8,
                downloads: 1250,
                isFeatured: true,
                createdAt: "2023-10-15",
                updatedAt: "2023-10-15"
            },
            {
                id: 2,
                title: "أساطير النار",
                author: "سارة القلم",
                description: "ملحمة عن التنين الأخير في العالم وأميرة تمتلك قوة التحكم بالنار.",
                genre: "فانتازيا ملحمية",
                coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                pdfUrl: "https://example.com/novels/fire-legends.pdf",
                chapters: 36,
                pages: 480,
                rating: 4.9,
                downloads: 1890,
                isFeatured: true,
                createdAt: "2023-09-22",
                updatedAt: "2023-09-22"
            }
        ],
        categories: [
            { id: 1, name: "فانتازيا مظلمة", count: 12 },
            { id: 2, name: "فانتازيا ملحمية", count: 8 },
            { id: 3, name: "فانتازيا شرقية", count: 15 },
            { id: 4, name: "فانتازيا تاريخية", count: 7 },
            { id: 5, name: "فانتازيا علمية", count: 9 }
        ],
        chapters: [],
        comments: [],
        downloads: [],
        aiChats: []
    };
    
    fs.writeFileSync('db.json', JSON.stringify(initialData, null, 2));
}

// تكوين multer للتحميلات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(middlewares);
app.use('/uploads', express.static('uploads'));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// وظيفة التحقق من التوكن
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'الوصول مرفوع. الرجاء تسجيل الدخول.' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'التوكن غير صالح.' });
        }
        req.user = user;
        next();
    });
}

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }
    
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
    
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            bio: user.bio
        }
    });
});

// إنشاء حساب جديد
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
    
    // التحقق من وجود المستخدم
    const userExists = db.users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً.' });
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // إنشاء المستخدم الجديد
    const newUser = {
        id: db.users.length + 1,
        name,
        email,
        password: hashedPassword,
        role: 'user',
        avatar: `https://i.pravatar.cc/150?img=${db.users.length + 1}`,
        bio: 'عاشق لروايات الفانتازيا',
        joinDate: new Date().toISOString().split('T')[0]
    };
    
    db.users.push(newUser);
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
    
    // إنشاء توكن
    const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
    
    res.json({
        token,
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            avatar: newUser.avatar,
            bio: newUser.bio
        }
    });
});

// الحصول على بيانات المستخدم
app.get('/api/user', authenticateToken, (req, res) => {
    const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
    const user = db.users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود.' });
    }
    
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        joinDate: user.joinDate
    });
});

// رفع ملف PDF
app.post('/api/upload/pdf', authenticateToken, upload.single('pdf'), (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'ليس لديك صلاحية لرفع الملفات.' });
    }
    
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار ملف.' });
    }
    
    res.json({
        message: 'تم رفع الملف بنجاح.',
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

// رفع صورة الغلاف
app.post('/api/upload/cover', authenticateToken, upload.single('cover'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار ملف.' });
    }
    
    res.json({
        message: 'تم رفع الصورة بنجاح.',
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

// روايات الذكاء الاصطناعي
app.post('/api/ai/generate', authenticateToken, (req, res) => {
    const { prompt, type } = req.body;
    
    // محاكاة استجابة الذكاء الاصطناعي
    const responses = {
        story: `بناءً على طلبك "${prompt}"، إليك فكرة رواية فانتازيا:

العنوان: ${prompt}
النوع: فانتازيا ملحمية
الملخص: في عالم تسكنه المخلوقات الأسطورية، بطلنا/بطلتنا يكتشف/تكتشف قوى خفية داخل نفسه/نفسها. معركة بين النور والظلام توشك أن تبدأ، والأقدار تتشابك في حبكة معقدة من التحالفات والخيانات.

الشخصيات الرئيسية:
1. البطل/البطلة: شاب/شابة من قرية نائية
2. المرشد: ساحر حكيم
3. الخصم: سيد الظلام
4. الحبيب/الحبيبة: أمير/أميرة من مملكة مجاورة

الفصل الأول: البداية
في قرية صغيرة عند أطراف الغابة المسحورة...`,
        
        chapter: `الفصل الجديد لرواية "${prompt}":
    
استمراراً للأحداث، وجد بطلنا نفسه/نفسها في مواجهة مباشرة مع التنين العظيم. الرياح تعوي والأمطار تتساقط بغزارة، وفي الأفق البعيد، تلوح معاقل الظلام.`,
        
        character: `شخصية جديدة لروايتك:
الاسم: ${prompt}
الصفات: شجاع، ذكي، يتمتع بحس فكاهي
القوى: التحكم بالعناصر
الخلفية: نشأ في مدينة عائمة في السماء
الهدف: العثور على والده المفقود`
    };
    
    const response = responses[type] || `بناءً على "${prompt}"، هذا محتوى رواية فانتازيا مقترح...`;
    
    res.json({
        success: true,
        content: response,
        timestamp: new Date().toISOString()
    });
});

// استخدام JSON Server للبيانات العادية
app.use('/api', router);

// نقطة وصول خاصة بالإدارة
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه البيانات.' });
    }
    
    const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
    
    const stats = {
        totalUsers: db.users.length,
        totalNovels: db.novels.length,
        totalDownloads: db.novels.reduce((sum, novel) => sum + (novel.downloads || 0), 0),
        totalComments: db.comments?.length || 0,
        activeUsers: db.users.filter(u => u.lastLogin).length,
        recentNovels: db.novels.slice(-5),
        topNovels: [...db.novels].sort((a, b) => b.downloads - a.downloads).slice(0, 5)
    };
    
    res.json(stats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📚 API متاحة على http://localhost:${PORT}/api`);
    console.log(`🔐 لوحة الإدارة: http://localhost:${PORT}/admin.html`);
    console.log(`👑 بيانات الدخول للإدارة:`);
    console.log(`   البريد: ${ADMIN_EMAIL}`);
    console.log(`   كلمة المرور: ${ADMIN_PASSWORD}`);
});
