// Make conn.
const socket = io.connect("http://localhost:8000");
let SECURE = false;

let message = document.getElementById("mensaje"),
	handle = document.getElementById("nombre"),
	btn = document.getElementById("enviar"),
	output = document.getElementById("output"),
	feedback = document.getElementById("feedback");

window.onload = () => {
	let body = document.body;

	// Generate b
	const b = Math.floor(Math.random() * 9) + 1;
	// Send request to obtain p & q from server
	socket.emit("request");
	// Receive p & q from server
	socket.on("request", data => {
		let { q, p } = data;
		console.log("q", q, "p", p);
		console.log("b", b);

		// Calculate B = q^b mod p
		let B = Math.pow(parseInt(q), b) % parseInt(p);
		console.log("B", B);

		// Send B to server and get K_a, A from server
		socket.emit("exchange", B);
		socket.on("exchange", data => {
			let { K_a, A } = data;
			// Calculate K_b = A^b mod p
			const K_b = Math.pow(A, b) % p;
			console.log("K_b", K_b);

			// Check if both keys match
			if (K_a == K_b) {
				btn.className = "";
				btn.disabled = false;
				SECURE = true;
				alert("La conexión es segura.");
				// Send request to obtain AES-128 key and IV
				socket.emit("secure");
			} else {
				btn.className += "disabled";
				btn.disabled = true;
				alert("La conexión NO es segura.");
			}
		});
	});
};

// Emit events
btn.addEventListener("click", function() {
	// Generate AES-128 key and IV
	const key = forge.random.getBytesSync(16);
	const iv = forge.random.getBytesSync(16);
	console.log(`Key : ${key}, IV : ${iv}`);
	// Encrypt message
	const cipher = forge.cipher.createCipher("AES-CBC", key);
	cipher.start({ iv: iv });
	cipher.update(forge.util.createBuffer(message.value));
	cipher.finish();
	const encryptedMsg = cipher.output.getBytes();
	console.log(encryptedMsg)
	socket.emit("chat", {
		message: encryptedMsg,
		handle: handle.value,
		key: key,
		iv: iv
	});
	message.value = "";
	console.log("secure", SECURE);
});

message.addEventListener("keypress", function() {
	socket.emit("typing", handle.value);
});

// Listen for events
socket.on("chat", function(data) {
	// Get AES-128 key and iv
	const key = data.key;
	const iv = data.iv;
	// Decrypted message
	const encMsg = forge.util.createBuffer(data.message);
	const decipher = forge.cipher.createDecipher("AES-CBC", key);
	decipher.start({ iv: iv });
	decipher.update(encMsg);
	const result = decipher.finish();
	console.log("Result", result);
	const decryptedMsg = decipher.output.toString();
	feedback.innerHTML = "";
	output.innerHTML +=
		"<p><strong>" + data.handle + ": </strong>" + decryptedMsg + "</p>";
});

socket.on("typing", function(data) {
	feedback.innerHTML = "<p><em>" + data + " está tipeando un mensaje...</em></p>";
});
