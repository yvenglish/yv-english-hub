import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcwGG7pZu_coWB2G_vtI99LurRCZijFVw",
  authDomain: "yv-hub-2253d.firebaseapp.com",
  projectId: "yv-hub-2253d",
  storageBucket: "yv-hub-2253d.firebasestorage.app",
  messagingSenderId: "715533060042",
  appId: "1:715533060042:web:7a3e88ed4085258ad8f133",
  measurementId: "G-5RL7T9E1SY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const wordsList = `improve = melhorar
decrease = diminuir
increase = aumentar
Hungry = fome
Noon = meio-dia
Midnight = meia-noite
Good afternoon = boa tarde
Good evening = boa noite (chegando)
Good night = boa noite (despedida)
Cup = copo
Sink = pia
Airport = aeroporto
Monday = segunda-feira
Tuesday = terça-feira
Wednesday = quarta
Thursday = quinta
Friday = sexta
Saturday = sábado
Sunday = domingo
Weekend = fim de semana
Door = porta
tall = alto
to read = ler
neighbor = vizinho
mainly = principalmente
to cook = cozinhar
main = principal
character = personagem
wonderful = maravilhoso
To believe = acreditar
There = ali / aí
To arrive = chegar
To complain = reclamar
To tell = contar/falar
To leave = deixar
As soon as possible = Assim que possível
Soon = logo / daqui a pouco
Free = livre / gratuito
Chair = cadeira
Quiet = quieto
Busy = ocupado
Noisy = barulhento
Rice = arroz
About = sobre
Yesterday = ontem
Before = antes
After = depois
Last = último
Tomorrow = amanhã
Often = frequência
Than = que
Ahead = na frente
To prefer = preferir
Out = fora
In = dentro
Outside = lado de fora
Side = lado
Inside = lado de dentro
To cry = chorar
Building = prédio / construindo
Notorious = notório
To need = precisar
To talk = conversar/falar
With = com
Shadow = sombra
To study = estudar
TO WAIT = ESPERAR
SMART = INTELIGENTE
FIRST = PRIMEIRO
SAME = MESMA/MESMO
CLASS = AULA
WHILE = ENQUANTO
How = como
When = quando
Under = sob/embaixo
Ready = pronto
What’s up? = e aí?
Cousin = primo / prima
Old = velho
Eye = olho
Lid = tampa
Eyelid = pálpebra
Usually = geralmente
Lovely = amavelmente
Frankly = francamente / abertamente
Firmly = firmemente
Sometimes = de vez em quando
Everytime = toda vez
Everyday = todos os dias
Something = alguma coisa
PARTY = FESTA
LATE = ATRASADO (A)
DINNER = JANTAR
From = de/do (origem)
Woman = mulher
Women = mulheres
Man = homen
Men = homens`;

async function seedData() {
  const lines = wordsList.split('\n').filter(l => l.trim() !== '');
  
  console.log(`Starting to insert ${lines.length} words...`);
  
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const term = parts[0].trim();
      const translation = parts.slice(1).join('=').trim();
      
      const payload = {
        term,
        translation,
        imageUrl: '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      try {
        await addDoc(collection(db, 'vocabulary_global'), payload);
        console.log(`Added: ${term}`);
      } catch (err) {
        console.error(`Failed to add ${term}:`, err);
      }
    }
  }
  
  console.log('Finished seeding words!');
  process.exit(0);
}

seedData();
