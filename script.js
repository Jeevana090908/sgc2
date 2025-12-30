/**
 * Grade Calculation App Logic
 * Handles Navigation, Auth, Data Storage, and UI Generation
 */

class GradeApp {
    constructor() {
        this.currentUser = null;
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        this.teachers = JSON.parse(localStorage.getItem('teachers')) || [{ user: 'admin', pass: 'admin' }];

        this.init();
    }

    init() {
        this.attachEventListeners();
        window.addEventListener('storage', (e) => this.syncData(e));
    }

    syncData(e) {
        if (e.key === 'students') {
            this.students = JSON.parse(e.newValue) || [];

            if (document.getElementById('page-view-grades').classList.contains('active')) {
                this.renderGradesTable('all');
            }

            if (document.getElementById('page-student-dash').classList.contains('active') && this.currentUser?.role === 'student') {
                const me = this.students.find(s => s.id === this.currentUser.id);
                if (me) {
                    this.currentUser = { ...this.currentUser, ...me };
                    this.loadStudentDash();
                } else {
                    alert('Your account has been removed.');
                    this.logout();
                }
            }
        }
    }

    /* --- Navigation --- */
    navigateTo(pageId, options = {}) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${pageId}`);
        if (target) target.classList.add('active');

        const header = document.getElementById('main-header');
        if (pageId === 'intro' || pageId.startsWith('login')) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }

        if (pageId === 'view-grades') {
            const btn = document.getElementById('btn-back-to-add');
            if (options.fromAdd) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }

            if (options.highlightMe && this.currentUser) {
                // Defer slightly to ensure table renders first
                setTimeout(() => this.renderGradesTable('all', { highlightId: this.currentUser.id }), 50);
            }
        }

        window.scrollTo(0, 0);
    }

    goBack() {
        const active = document.querySelector('.page.active');
        if (!active) return;

        const id = active.id;
        if (id.includes('login')) this.navigateTo('intro');
        if (id === 'page-add-student') this.navigateTo('teacher-dash');
        if (id === 'page-view-grades') {
            if (this.currentUser?.role === 'teacher') this.navigateTo('teacher-dash');
            else this.navigateTo('student-dash');
        }
    }

    /* --- Authentication --- */
    toggleAuthTab(role, mode) {
        const parent = document.querySelector(`#page-login-${role} .form-container`);
        parent.querySelectorAll('.tab').forEach(t => t.classList.toggle('active'));
        parent.querySelectorAll('form').forEach(f => f.classList.remove('active'));

        const formId = `${role}-${mode}-form`;
        document.getElementById(formId).classList.add('active');
    }

    handleLogin(role, event) {
        event.preventDefault();

        if (role === 'teacher') {
            const user = document.getElementById('t-login-user').value;
            const pass = document.getElementById('t-login-pass').value;

            const valid = this.teachers.find(t => t.user === user && t.pass === pass);
            if (valid) {
                this.currentUser = { role: 'teacher', ...valid };
                this.navigateTo('teacher-dash');
            } else {
                alert('Invalid Teacher Credentials (Try admin/admin)');
            }
        } else {
            const user = document.getElementById('s-login-id').value;
            const pass = document.getElementById('s-login-pass').value;

            const valid = this.students.find(s => s.id === user && s.pass === pass);
            if (valid) {
                this.currentUser = { role: 'student', ...valid };
                this.loadStudentDash();
                this.navigateTo('student-dash');
            } else {
                alert('Student not found or wrong password');
            }
        }
    }

    handleSignup(role, event) {
        event.preventDefault();

        if (role === 'teacher') {
            const user = document.getElementById('t-signup-user').value;
            const pass = document.getElementById('t-signup-pass').value;

            // Teacher Name Validation: Letters only
            const userRegex = /^[a-zA-Z]+$/;
            if (!userRegex.test(user)) {
                alert('Invalid Username: Please use only letters (A-Z, a-z). No numbers, spaces, or special characters.');
                return;
            }

            const passRegex = /^[a-zA-Z0-9]+$/;
            if (!passRegex.test(pass)) {
                alert('Invalid Password: Only letters (A-Z, a-z) and numbers (0-9) are allowed. No spaces or special characters.');
                return;
            }

            this.teachers.push({ user, pass });
            localStorage.setItem('teachers', JSON.stringify(this.teachers));
            alert('Teacher Signed Up! Please Login.');
            this.toggleAuthTab('teacher', 'login');

        } else {
            const id = document.getElementById('s-signup-id').value;
            const name = document.getElementById('s-signup-name').value;
            const pass = document.getElementById('s-signup-pass').value;

            const passRegex = /^[a-zA-Z0-9]+$/;
            if (!passRegex.test(pass)) {
                alert('Invalid Password: Only letters (A-Z, a-z) and numbers (0-9) are allowed. No spaces or special characters.');
                return;
            }

            const nameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
            if (!nameRegex.test(name)) {
                alert('Invalid Name: Please use only letters and single spaces between words (no numbers or special characters).');
                return;
            }

            const existingStudent = this.students.find(s => s.id === id);

            if (!existingStudent) {
                alert('Student ID not found! Your teacher must add your details (ID & Name) before you can sign up.');
                return;
            }

            if (existingStudent.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
                alert(`Name mismatch! The ID "${id}" is registered with a different name. Please contact your teacher.`);
                return;
            }

            existingStudent.pass = pass;
            localStorage.setItem('students', JSON.stringify(this.students));

            alert('Signup Successful! Password set. Please Login.');
            this.toggleAuthTab('student', 'login');
        }
    }

    logout() {
        this.currentUser = null;
        this.navigateTo('intro');
    }

    /* --- Teacher: Add Student --- */
    generateSubjectInputs() {
        const count = parseInt(document.getElementById('as-subjects-count').value);
        const container = document.getElementById('subject-inputs-container');
        container.innerHTML = '';

        if (!count || count < 0) return;

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `<input type="number" placeholder="Sub ${i + 1} Marks" class="sub-mark" max="100" required>`;
            container.appendChild(div);
        }

        document.getElementById('btn-add-student-final').classList.remove('hidden');
    }

    addStudent(event) {
        event.preventDefault();

        const id = document.getElementById('as-id').value;
        const name = document.getElementById('as-name').value;
        const branch = document.getElementById('as-branch').value;
        const year = document.getElementById('as-year').value;
        const section = document.getElementById('as-section').value;

        const nameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
        if (!nameRegex.test(name)) {
            alert('Invalid Name: Please use only letters and single spaces between words (no numbers or special characters).');
            return;
        }

        const markInputs = document.querySelectorAll('.sub-mark');
        let total = 0;
        let marks = [];
        let hasFail = false;

        markInputs.forEach((input, index) => {
            const m = parseFloat(input.value) || 0;
            marks.push({ subject: `Subject ${index + 1}`, mark: m });
            total += m;
            if (m < 35) hasFail = true;
        });

        const maxTotal = marks.length * 100;
        const percentage = (total / maxTotal) * 100;
        const cgpa = (percentage / 9.5).toFixed(2);

        let grade = 'F';
        if (!hasFail) {
            const cgpaNum = parseFloat(cgpa);
            if (cgpaNum >= 9.0) grade = 'A';
            else if (cgpaNum >= 8.0) grade = 'B';
            else if (cgpaNum >= 7.0) grade = 'C';
            else if (cgpaNum >= 6.0) grade = 'D';
            else grade = 'E';
        } else {
            grade = 'Fail';
        }

        const newStudent = {
            id, name, branch, year, section, marks, total, cgpa, grade,
            pass: id
        };

        const idx = this.students.findIndex(s => s.id === id);
        if (idx >= 0) {
            newStudent.pass = this.students[idx].pass;
            this.students[idx] = newStudent;
        } else {
            this.students.push(newStudent);
        }

        localStorage.setItem('students', JSON.stringify(this.students));

        alert('Student Added Successfully!');
        document.getElementById('add-student-form').reset();
        document.getElementById('subject-inputs-container').innerHTML = '';
        document.getElementById('btn-add-student-final').classList.add('hidden');

        this.navigateTo('view-grades', { fromAdd: true });
        this.renderGradesTable('all');
    }

    /* --- View Grades --- */
    renderGradesTable(filter, criteria = {}) {
        const tbody = document.getElementById('grades-table-body');
        tbody.innerHTML = '';

        let displayData = [...this.students];

        if (filter === 'rank-high') {
            displayData.sort((a, b) => b.cgpa - a.cgpa);
        } else if (filter === 'failed') {
            displayData = displayData.filter(s => s.grade === 'Fail');
        } else if (filter === 'advanced') {
            if (criteria.branch) {
                displayData = displayData.filter(s => s.branch === criteria.branch);
            }
            if (criteria.section) {
                displayData = displayData.filter(s => s.section.toLowerCase() === criteria.section.toLowerCase());
            }
        }

        if (displayData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No students found</td></tr>';
            return;
        }

        displayData.forEach((s, index) => {
            const tr = document.createElement('tr');

            if (criteria.highlightId && s.id === criteria.highlightId) {
                tr.classList.add('highlight-row');
                // Scroll into view logic could go here
                setTimeout(() => tr.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${s.id}</td>
                <td class="prevent-select student-name-cell" data-id="${s.id}" data-name="${s.name}">${s.name}</td>
                <td>${s.branch}</td>
                <td>${s.year} / ${s.section}</td>
                <td>${s.total}</td>
                <td>${s.cgpa}</td>
                <td style="color: ${s.grade === 'Fail' ? '#ef4444' : '#2dd4bf'}">${s.grade}</td>
            `;
            tbody.appendChild(tr);

            if (this.currentUser?.role === 'teacher') {
                const nameCell = tr.querySelector('.student-name-cell');
                let pressTimer;

                const startPress = () => {
                    pressTimer = setTimeout(() => {
                        this.showRemoveModal(s.id, s.name);
                    }, 800);
                };

                const endPress = () => {
                    clearTimeout(pressTimer);
                };

                nameCell.addEventListener('mousedown', startPress);
                nameCell.addEventListener('mouseup', endPress);
                nameCell.addEventListener('mouseleave', endPress);

                nameCell.addEventListener('touchstart', startPress);
                nameCell.addEventListener('touchend', endPress);
            }
        });
    }

    filterStudents(type) {
        this.renderGradesTable(type);
    }

    applyAdvancedFilter() {
        const branch = document.getElementById('filter-branch').value;
        const section = document.getElementById('filter-section').value.trim();

        this.renderGradesTable('advanced', { branch, section });
    }

    /* --- Remove Student --- */
    showRemoveModal(id, name) {
        document.getElementById('delete-student-name').innerText = name;
        document.getElementById('delete-modal').classList.remove('hidden');

        const btn = document.getElementById('confirm-delete-btn');
        btn.onclick = () => this.deleteStudent(id);
    }

    closeModal() {
        document.getElementById('delete-modal').classList.add('hidden');
    }

    deleteStudent(id) {
        this.students = this.students.filter(s => s.id !== id);
        localStorage.setItem('students', JSON.stringify(this.students));
        this.closeModal();
        this.renderGradesTable('all');
    }

    /* --- Student Dashboard --- */
    loadStudentDash() {
        document.getElementById('student-welcome-name').innerText = `Hello, ${this.currentUser.name}`;

        const tbody = document.getElementById('my-marks-body');
        tbody.innerHTML = '';

        if (!this.currentUser.marks || this.currentUser.marks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No marks added yet by teacher.</td></tr>';
            document.getElementById('my-summary-footer').innerText = '';
            return;
        }

        this.currentUser.marks.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.subject}</td>
                <td>${m.mark}</td>
                <td>${m.mark >= 35 ? 'Pass' : 'Fail'}</td>
             `;
            tbody.appendChild(tr);
        });

        document.getElementById('my-summary-footer').innerHTML = `
            Total: ${this.currentUser.total} | CGPA: ${this.currentUser.cgpa} | Grade: ${this.currentUser.grade}
        `;
    }

    /* --- Helpers --- */
    clearInput(id) {
        const input = document.getElementById(id);
        if (input) input.value = '';
    }

    attachEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        document.getElementById('teacher-login-form').addEventListener('submit', (e) => this.handleLogin('teacher', e));
        document.getElementById('teacher-signup-form').addEventListener('submit', (e) => this.handleSignup('teacher', e));

        document.getElementById('student-login-form').addEventListener('submit', (e) => this.handleLogin('student', e));
        document.getElementById('student-signup-form').addEventListener('submit', (e) => this.handleSignup('student', e));

        document.getElementById('add-student-form').addEventListener('submit', (e) => this.addStudent(e));

        document.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('input', function () {
                const icon = this.nextElementSibling;
                if (icon && icon.classList.contains('clear-input')) {
                    icon.style.display = this.value ? 'block' : 'none';
                }
            });
        });
    }
}

const app = new GradeApp();
