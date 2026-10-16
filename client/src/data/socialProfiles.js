import chandraMohanVaddi from '../assets/social/chandra-mohan-vaddi.jpg';
import somashekharSp from '../assets/social/somashekhar-sp.jpg';
import maganMehrotra from '../assets/social/magan-mehrotra.jpg';
import lalitAdityaMalik from '../assets/social/lalit-aditya-malik.jpg';
import sudhirRawal from '../assets/social/sudhir-rawal.jpg';
import nitinRajput from '../assets/social/nitin-rajput.jpg';

// Surgeons' YouTube channels shown on "Social profile" (in this order).
// Photo matching: Lalit Aditya Malik and Magan Mehrotra by the name on the
// coat, Nitin Rajput by the Medanta logo; Chandra Mohan Vaddi, S P Somashekhar
// and Sudhir Rawal by upload order — swap the imports above if one is wrong.
export const SOCIAL_PROFILES = [
  {
    id: 'chandra-mohan-vaddi',
    name: 'Dr. Chandra Mohan Vaddi',
    affiliation: 'Preeti Urology & Kidney Hospital',
    photo: chandraMohanVaddi,
    channel: 'https://www.youtube.com/@PreetiKidneyHospital',
    handle: '@PreetiKidneyHospital',
  },
  {
    id: 'somashekhar-sp',
    name: 'Dr. S P Somashekhar',
    photo: somashekharSp,
    channel: 'https://www.youtube.com/@dr.somashekharsp8545',
    handle: '@dr.somashekharsp8545',
  },
  {
    id: 'magan-mehrotra',
    name: 'Dr. Magan Mehrotra',
    photo: maganMehrotra,
    channel: 'https://www.youtube.com/@youcanbealoser4822',
    handle: '@youcanbealoser4822',
  },
  {
    id: 'lalit-aditya-malik',
    name: 'Dr. Lalit Aditya Malik',
    photo: lalitAdityaMalik,
    channel: 'https://www.youtube.com/@dr.lalitadityamalik',
    handle: '@dr.lalitadityamalik',
  },
  {
    id: 'sudhir-rawal',
    name: 'Dr. Sudhir Rawal',
    affiliation: 'Rajiv Gandhi Cancer Institute and Research Center',
    photo: sudhirRawal,
    channel: 'https://www.youtube.com/@uro-oncologysurgicaltechni3250',
    handle: '@uro-oncologysurgicaltechni3250',
  },
  {
    id: 'nitin-rajput',
    name: 'Dr. Nitin Rajput',
    affiliation: 'Medanta Hospital',
    photo: nitinRajput,
    channel: 'https://www.youtube.com/@minimallyinvasiveroboticca5796',
    handle: '@minimallyinvasiveroboticca5796',
  },
];
