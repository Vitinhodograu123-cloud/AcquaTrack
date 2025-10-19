// Variáveis globais
let currentSection = 'bases';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadBases();
});

// Verificação de autenticação
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('username').textContent = user.username;
}

// Setup de event listeners
function setupEventListeners() {
    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Botão de adicionar
    document.getElementById('addBtn').addEventListener('click', () => {
        const modal = document.getElementById(`add${currentSection.slice(0, -1).charAt(0).toUpperCase() + currentSection.slice(1, -1)}Modal`);
        modal.style.display = 'block';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // Forms
    document.getElementById('addBaseForm').addEventListener('submit', handleAddBase);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);

    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

// Trocar seção
function switchSection(section) {
    currentSection = section;
    
    // Atualiza título
    document.getElementById('sectionTitle').textContent = `Gerenciamento de ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    
    // Atualiza menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Mostra/esconde listas
    document.querySelectorAll('.grid-list').forEach(list => {
        list.style.display = list.id === `${section}List` ? 'grid' : 'none';
    });

    // Carrega dados da seção
    switch(section) {
        case 'bases':
            loadBases();
            break;
        case 'users':
            loadUsers();
            break;
        case 'units':
            loadUnits();
            break;
    }
}

// Carregar bases
async function loadBases() {
    try {
        const response = await fetch('/api/bases', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Endpoint /api/bases não encontrado. Verifique o servidor.');
                displayBases([]); // Exibe lista vazia
                return;
            }
            throw new Error(`Erro ${response.status} ao carregar bases`);
        }

        const bases = await response.json();
        displayBases(bases);
        updateBaseSelect(bases);
    } catch (error) {
        console.error('Erro ao carregar bases:', error);
        if (error.name !== 'TypeError') { // Não mostra erro para CORS/network
            showError('Erro ao carregar bases');
        }
        displayBases([]); // Exibe lista vazia em caso de erro
    }
}

// Atualizar select de bases
function updateBaseSelect(bases) {
    const baseSelect = document.getElementById('userBase');
    baseSelect.innerHTML = '';
    
    bases.forEach(base => {
        const option = document.createElement('option');
        option.value = base._id;
        option.textContent = base.name;
        baseSelect.appendChild(option);
    });
}

// Exibir bases
// Exibir bases
function displayBases(bases) {
    const basesList = document.getElementById('basesList');
    basesList.innerHTML = '';

    if (!bases || bases.length === 0) {
        basesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building fa-3x"></i>
                <h3>Nenhuma base encontrada</h3>
                <p>Adicione uma nova base usando o botão "Adicionar".</p>
            </div>
        `;
        return;
    }

    bases.forEach(base => {
        const baseElement = document.createElement('div');
        baseElement.className = 'grid-item';
        baseElement.innerHTML = `
            <div class="grid-item-header">
                <h3 class="grid-item-title">${base.name}</h3>
                <div class="grid-item-actions">
                    <button class="btn-secondary btn-sm" onclick="editBase('${base._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="grid-item-info">
                <div class="info-row">
                    <span class="info-label">Unidades:</span>
                    <span class="info-value">${base.units?.length || 0}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Usuários:</span>
                    <span class="info-value">${base.users?.length || 0}</span>
                </div>
            </div>
        `;
        basesList.appendChild(baseElement);
    });
}

// Carregar usuários
// Carregar usuários
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Endpoint /api/users não encontrado. Verifique o servidor.');
                displayUsers([]);
                return;
            }
            throw new Error(`Erro ${response.status} ao carregar usuários`);
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        if (error.name !== 'TypeError') {
            showError('Erro ao carregar usuários');
        }
        displayUsers([]);
    }
}

// Exibir usuários
// Exibir usuários
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users fa-3x"></i>
                <h3>Nenhum usuário encontrado</h3>
                <p>Adicione um novo usuário usando o botão "Adicionar".</p>
            </div>
        `;
        return;
    }

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'grid-item';
        userElement.innerHTML = `
            <div class="grid-item-header">
                <h3 class="grid-item-title">${user.username}</h3>
                <div class="grid-item-actions">
                    <button class="btn-secondary btn-sm" onclick="editUser('${user._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger btn-sm" onclick="deleteUser('${user._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="grid-item-info">
                <div class="info-row">
                    <span class="info-label">Base:</span>
                    <span class="info-value">${user.base?.name || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Permissão:</span>
                    <span class="info-value">${user.role || 'Usuário'}</span>
                </div>
            </div>
        `;
        usersList.appendChild(userElement);
    });
}
// Adicionar usuário
async function handleAddUser(e) {
    e.preventDefault();

    const formData = {
        username: document.getElementById('userName').value,
        password: document.getElementById('userPassword').value,
        base: document.getElementById('userBase').value
    };

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Erro ao criar usuário');

        showSuccess('Usuário criado com sucesso');
        closeModal('addUserModal');
        loadUsers();
    } catch (error) {
        showError(error.message);
    }
}

// Deletar usuário
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao deletar usuário');

        showSuccess('Usuário deletado com sucesso');
        loadUsers();
    } catch (error) {
        showError(error.message);
    }
}

// Adicionar base
async function handleAddBase(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('baseName').value,
        description: document.getElementById('baseDescription').value,
        adminUsername: document.getElementById('baseUsername').value,
        adminPassword: document.getElementById('basePassword').value
    };

    try {
        const response = await fetch('/api/bases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Erro ao criar base');

        showSuccess('Base criada com sucesso');
        closeModal('addBaseModal');
        loadBases();
    } catch (error) {
        showError(error.message);
    }
}

// Carregar unidades
async function loadUnits() {
    try {
        const response = await fetch('/api/units', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Endpoint /api/units não encontrado');
                displayUnits([]);
                return;
            }
            throw new Error(`Erro ${response.status} ao carregar unidades`);
        }

        const units = await response.json();
        displayUnits(units);
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        if (error.name !== 'TypeError') {
            showError('Erro ao carregar unidades');
        }
        displayUnits([]);
    }
}

// Exibir unidades (função placeholder)
function displayUnits(units) {
    const unitsList = document.getElementById('unitsList');
    unitsList.innerHTML = '';

    if (units.length === 0) {
        unitsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-water fa-3x"></i>
                <h3>Nenhuma unidade encontrada</h3>
                <p>As unidades serão exibidas aqui quando disponíveis.</p>
            </div>
        `;
        return;
    }

    // Implementar exibição de unidades quando a API estiver disponível
    units.forEach(unit => {
        const unitElement = document.createElement('div');
        unitElement.className = 'grid-item';
        unitElement.innerHTML = `
            <div class="grid-item-header">
                <h3 class="grid-item-title">${unit.name || 'Unidade'}</h3>
                <div class="grid-item-actions">
                    <button class="btn-secondary btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="grid-item-info">
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${unit.status || 'N/A'}</span>
                </div>
            </div>
        `;
        unitsList.appendChild(unitElement);
    });
}

// Funções auxiliares
function showSuccess(message) {
    Notifications.success(message);
}

function showError(message) {
    Notifications.error(message);
}

function closeModal(modalId = null) {
    let modal;
    
    if (modalId) {
        modal = document.getElementById(modalId);
    } else {
        // Se não especificou o modal, fecha todos os modais abertos
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.querySelector('form')?.reset();
        });
        return;
    }
    
    if (modal) {
        modal.style.display = 'none';
        // Limpa o formulário
        modal.querySelector('form')?.reset();
    }
}