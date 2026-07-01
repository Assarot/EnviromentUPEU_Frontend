export class Teacher {
  idTeacher?: number;
  name: string;
  lastName: string;
  email: string;
  authUserId?: number;
  constructor(
    name: string,
    lastName: string,
    email: string,
    idTeacher?: number,
    authUserId?: number
  ) {
    if (idTeacher) {
      this.idTeacher = idTeacher;
    }
    this.name = name;
    this.lastName = lastName;
    this.email = email;
    this.authUserId = authUserId;
  }
}
