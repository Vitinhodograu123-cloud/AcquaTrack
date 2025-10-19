const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const uri = 'mongodb://localhost:27017/watertank';
const client = new MongoClient(uri);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para fazer perguntas
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// Menu principal
async function showMenu() {
    console.log('\n=================================');
    console.log('🚀 GERENCIADOR WATER TANK - CLI');
    console.log('=================================');
    console.log('1. 🏭  Adicionar Unidade');
    console.log('2. 👤  Adicionar Usuário');
    console.log('3. 📋  Listar Unidades');
    console.log('4. 👥  Listar Usuários');
    console.log('5. 📊  Ver Estatísticas');
    console.log('6. 🗑️   Limpar Banco');
    console.log('7. ❌  Sair');
    console.log('=================================\n');
}

// Adicionar Unidade
async function addUnit() {
    console.log('\n🎯 ADICIONANDO NOVA UNIDADE\n');
    
    const name = await question('Nome da unidade: ');
    const location = await question('Localização (condomínio): ');
    const type = await question('Tipo (CAIXA/CISTERNA): ');
    const sensors = await question('Número de sensores: ');
    
    const db = client.db();
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    const unit = {
        name,
        description: `${type} em ${location}`,
        location,
        type: type.toUpperCase(),
        numberOfSensors: parseInt(sensors) || 4,
        apiKey,
        isOnline: false,
        status: "ACTIVE",
        createdAt: new Date(),
        lastData: {
            waterLevel: 0,
            temperature: 0,
            vibration: false,
            vibrationCount: 0,
            isLowLevel: false,
            isHighTemp: false,
            isVibrating: false,
            boias: [],
            timestamp: new Date()
        },
        tanks: []
    };
    
    try {
        await db.collection('units').insertOne(unit);
        console.log('\n✅ UNIDADE ADICIONADA COM SUCESSO!');
        console.log('================================');
        console.log(`🏭 Nome: ${name}`);
        console.log(`📍 Local: ${location}`);
        console.log(`🔧 Tipo: ${type}`);
        console.log(`🔑 API Key: ${apiKey}`);
        console.log(`🌐 URL do Ngrok: (configure depois)`);
        console.log(`📡 Endpoint: /api/units/data`);
        console.log('================================\n');
    } catch (error) {
        console.log('❌ Erro ao adicionar unidade:', error.message);
    }
}

// Adicionar Usuário
async function addUser() {
    console.log('\n🎯 ADICIONANDO NOVO USUÁRIO\n');
    
    const username = await question('Username: ');
    const password = await question('Senha: ');
    const role = await question('Role (admin/user): ');
    
    const db = client.db();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = {
        username,
        password: hashedPassword,
        role: role.toLowerCase(),
        createdAt: new Date()
    };
    
    try {
        await db.collection('users').insertOne(user);
        console.log('\n✅ USUÁRIO ADICIONADO COM SUCESSO!');
        console.log('================================');
        console.log(`👤 Username: ${username}`);
        console.log(`🔐 Senha: ${password}`);
        console.log(`🎯 Role: ${role}`);
        console.log('================================\n');
    } catch (error) {
        console.log('❌ Erro ao adicionar usuário:', error.message);
    }
}

// Listar Unidades
async function listUnits() {
    const db = client.db();
    const units = await db.collection('units').find({}).toArray();
    
    console.log('\n🏭 UNIDADES CADASTRADAS');
    console.log('=====================\n');
    
    if (units.length === 0) {
        console.log('ℹ️  Nenhuma unidade encontrada');
        return;
    }
    
    units.forEach((unit, index) => {
        console.log(`${index + 1}. ${unit.name}`);
        console.log(`   📍 ${unit.location} | 🔧 ${unit.type}`);
        console.log(`   🔑 ${unit.apiKey}`);
        console.log(`   📊 Sensores: ${unit.numberOfSensors}`);
        console.log(`   🆔 ${unit._id}`);
        console.log('   ---');
    });
    
    console.log(`\n📊 Total: ${units.length} unidades`);
}

// Listar Usuários
async function listUsers() {
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log('\n👤 USUÁRIOS CADASTRADOS');
    console.log('=====================\n');
    
    if (users.length === 0) {
        console.log('ℹ️  Nenhum usuário encontrado');
        return;
    }
    
    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username}`);
        console.log(`   🎯 ${user.role}`);
        console.log(`   📅 ${user.createdAt}`);
        console.log(`   🆔 ${user._id}`);
        console.log('   ---');
    });
    
    console.log(`\n📊 Total: ${users.length} usuários`);
}

// Estatísticas
async function showStats() {
    const db = client.db();
    
    const unitsCount = await db.collection('units').countDocuments();
    const usersCount = await db.collection('users').countDocuments();
    const readingsCount = await db.collection('readings').countDocuments();
    const unitdatasCount = await db.collection('unitdatas').countDocuments();
    
    console.log('\n📊 ESTATÍSTICAS DO BANCO');
    console.log('=======================\n');
    console.log(`🏭 Unidades: ${unitsCount}`);
    console.log(`👤 Usuários: ${usersCount}`);
    console.log(`📈 Leituras: ${readingsCount}`);
    console.log(`📋 UnitDatas: ${unitdatasCount}`);
    console.log(`💾 Banco: watertank`);
    console.log(`🌐 MongoDB: localhost:27017`);
}

// Limpar Banco (CUIDADO!)
async function clearDatabase() {
    const confirm = await question('\n🚨 ATENÇÃO: Isso vai apagar TODOS os dados! Digite "SIM" para confirmar: ');
    
    if (confirm === 'SIM') {
        const db = client.db();
        
        await db.collection('units').deleteMany({});
        await db.collection('users').deleteMany({});
        await db.collection('readings').deleteMany({});
        await db.collection('unitdatas').deleteMany({});
        await db.collection('tanks').deleteMany({});
        
        console.log('✅ Banco limpo com sucesso!');
    } else {
        console.log('❌ Operação cancelada');
    }
}

// Processar opção do menu
async function processOption(option) {
    switch(option) {
        case '1':
            await addUnit();
            break;
        case '2':
            await addUser();
            break;
        case '3':
            await listUnits();
            break;
        case '4':
            await listUsers();
            break;
        case '5':
            await showStats();
            break;
        case '6':
            await clearDatabase();
            break;
        case '7':
            console.log('👋 Saindo...');
            rl.close();
            await client.close();
            process.exit(0);
        default:
            console.log('❌ Opção inválida!');
    }
}

// Inicializar sistema
async function init() {
    try {
        await client.connect();
        console.log('✅ Conectado ao MongoDB local');
        
        // Loop principal
        while (true) {
            await showMenu();
            const option = await question('Escolha uma opção (1-7): ');
            await processOption(option);
            
            // Pequena pausa
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.log('❌ Erro ao conectar ao MongoDB:', error.message);
        process.exit(1);
    }
}

// Iniciar o sistema
init();