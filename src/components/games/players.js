// Componente que joga cada tipo de jogo (os importados no admin e os gerados a partir do deck)
import WordGuess from './WordGuess';
import SentenceBuilder from './SentenceBuilder';
import ListenChoose from './ListenChoose';
import ImageGame from './ImageGame';

export const PLAYERS = { word_guess: WordGuess, sentence_builder: SentenceBuilder, listen: ListenChoose, image: ImageGame };
