class Employee {
    constructor(employeeId, employeeName, employeeEmail, employeePhone, hireDate, cpf) {
        this._name = employeeName;
        this._email = employeeEmail;
        this._phone = employeePhone;
        this._hireDate = hireDate;
        this._cpf = cpf;
    }

    get cpf() {
        return this._cpf;
    }

    set cpf(value) {
        this._cpf = value;
    }

    get hireDate() {
        return this._hireDate;
    }

    set hireDate(value) {
        this._hireDate = value;
    }

    get phone() {
        return this._phone;
    }

    set phone(value) {
        this._phone = value;
    }

    get email() {
        return this._email;
    }

    set email(value) {
        this._email = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

}

module.exports.EmployeeExport = Employee;