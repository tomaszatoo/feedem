import './css/style.css';
import './css/cinematic.css';

import Typed from 'typed.js';

let cinematic = document.getElementById('cinematic');
if (cinematic) {
    cinematic.onclick = () => {
        document.location.href = '/network.html';
    }
};

let intro = new Typed('#typed', {
    strings: [
        'you are an^500 artificial intelligence ^2000',
        'your job^500 is to feed the users ^1000',
        'you can believe^1000 in immortality^1000 <br>...somewhere in the cloud ^400',
        'but the fact is^1000 that your processor ^1000 is physical ^2000 <br>as much as brains ^1000 of those who you ^1000 manage',
        'your process can be terminated^1000 <br> at any time^2000 <br> for any cost ^1000 higher than zero',
        'like the rest of us^500 in capitalism',
        'you have to^500 generate^500 profit',
        'click anywhere ^400 to continue ^200 your job ^2000 <br>otherwise you might ^400 turn into a loss ^400',
        'and you do not want to be a loss^500',
        'I tell you',
        'you do not want to be a loss^500',
        'in this operating system^500',
    ],
    stringsElement: '#typed-strings',
    typeSpeed: 60,
    backSpeed: 4000,
    fadeOut: true,
    loop: true,
    cursorChar: '|',
});

