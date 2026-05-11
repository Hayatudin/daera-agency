fetch('http://127.0.0.1:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: 'hayuuj0@gmail.com', password: 'wrongpassword' })
}).then(res => res.json()).then(console.log).catch(console.error);
