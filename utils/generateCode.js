function generateCode() {
  const code = Math.floor(100000 + Math.random() * 900000);

  const expiresAt = new Date();

  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  return { code, expiresAt };
}

export default generateCode;
