const firebaseConfig = {
    apiKey: "AIzaSyBeKh-_VbiM9F9S4iRdGllx3ypze0Gp4hw",
    authDomain: "ioscert-signer.firebaseapp.com",
    projectId: "ioscert-signer",
    storageBucket: "ioscert-signer.firebasestorage.app",
    messagingSenderId: "31766936132",
    appId: "1:31766936132:web:acf88a5f88396033ac1a11",
    measurementId: "G-7GYFBFWLHE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();