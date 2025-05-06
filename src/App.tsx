import { useState, useEffect } from 'react';
import { questionSets } from './questions';
import './index.css';
import { useSDK, useAddress, useConnect, useDisconnect, metamaskWallet } from '@thirdweb-dev/react';
import { ethers } from 'ethers';

function App() {
  const address = useAddress();
  const sdk = useSDK();
  const connect = useConnect();
  const disconnect = useDisconnect();

  console.log('Address:', address); // Отладка

  const getStorageKey = (key: string) => address ? `${address}_${key}` : key;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [lastLifeUpdate, setLastLifeUpdate] = useState(new Date().toISOString());
  const [feedback, setFeedback] = useState('');
  const [feedbackImage, setFeedbackImage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [showFinalScreen, setShowFinalScreen] = useState(false);
  const [showGameOverPrompt, setShowGameOverPrompt] = useState(false);
  const [lastRoundTimestamp, setLastRoundTimestamp] = useState('0');
  const [lastCastTimestamp, setLastCastTimestamp] = useState('0');
  const [lastDonateTimestamp, setLastDonateTimestamp] = useState('0');
  const [isAnswering, setIsAnswering] = useState(false);
  const maxQuestions = 10;

  // Загрузка состояния из localStorage после получения address
  useEffect(() => {
    if (address) {
      const lastRound = parseInt(localStorage.getItem(getStorageKey('lastRoundTimestamp')) || '0');
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const isNewDay = Date.now() - lastRound >= oneDayInMs;

      if (isNewDay) {
        // Новый день: сбрасываем игру
        setCurrentQuestion(0);
        setScore(0);
        setLives(3);
        setGameOver(false);
        setShowFinalScreen(false);
        setShowGameOverPrompt(false);
        localStorage.setItem(getStorageKey('currentQuestion'), '0');
        localStorage.setItem(getStorageKey('score'), '0');
        localStorage.setItem(getStorageKey('lives'), '3');
        localStorage.setItem(getStorageKey('gameOver'), 'false');
        localStorage.setItem(getStorageKey('showFinalScreen'), 'false');
        localStorage.setItem(getStorageKey('showGameOverPrompt'), 'false');
      } else {
        // Продолжаем старую игру
        setCurrentQuestion(parseInt(localStorage.getItem(getStorageKey('currentQuestion')) || '0'));
        setScore(parseInt(localStorage.getItem(getStorageKey('score')) || '0'));
        setLives(parseInt(localStorage.getItem(getStorageKey('lives')) || '3'));
        setGameOver(JSON.parse(localStorage.getItem(getStorageKey('gameOver')) || 'false'));
        setShowFinalScreen(JSON.parse(localStorage.getItem(getStorageKey('showFinalScreen')) || 'false'));
        setShowGameOverPrompt(JSON.parse(localStorage.getItem(getStorageKey('showGameOverPrompt')) || 'false'));
      }

      // TotalScore и таймеры загружаем всегда
      setTotalScore(parseInt(localStorage.getItem(getStorageKey('totalScore')) || '0'));
      setLastLifeUpdate(localStorage.getItem(getStorageKey('lastLifeUpdate')) || new Date().toISOString());
      setLastRoundTimestamp(localStorage.getItem(getStorageKey('lastRoundTimestamp')) || '0');
      setLastCastTimestamp(localStorage.getItem(getStorageKey('lastCastTimestamp')) || '0');
      setLastDonateTimestamp(localStorage.getItem(getStorageKey('lastDonateTimestamp')) || '0');
    }
  }, [address]);

  const handleConnect = async () => {
    try {
      await connect(metamaskWallet());
      alert('Wallet connected!');
    } catch (error: unknown) {
      console.error('Connect error:', error);
      alert('Wallet connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      alert('Wallet disconnected!');
      // Сбрасываем UI-состояние, сохраняя localStorage
      setCurrentQuestion(0);
      setScore(0);
      setTotalScore(parseInt(localStorage.getItem(getStorageKey('totalScore')) || '0'));
      setLives(3);
      setLastLifeUpdate(new Date().toISOString());
      setGameOver(false);
      setShowFinalScreen(false);
      setShowGameOverPrompt(false);
      setLastRoundTimestamp('0');
      setLastCastTimestamp('0');
      setLastDonateTimestamp('0');
    } catch (error: unknown) {
      console.error('Disconnect error:', error);
      alert('Disconnect failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const canDonate = () => {
    const now = Date.now();
    const lastDonate = parseInt(lastDonateTimestamp) || 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return now - lastDonate >= oneDayInMs;
  };

  const handleDonate = async () => {
    if (!canDonate()) {
      alert('You can only restore lives via donation once per day!');
      return;
    }
    if (!address || !sdk) {
      await handleConnect();
      if (!address || !sdk) {
        alert('Please connect your wallet!');
        return;
      }
    }
    try {
      const signer = sdk.getSigner();
      if (!signer) {
        alert('Signer not available. Please reconnect wallet.');
        return;
      }
      const provider = signer.provider;
      if (!provider) {
        alert('Provider not available. Please reconnect wallet.');
        return;
      }
      const network = await provider.getNetwork();
      const expectedChainId = 8453; // Base Mainnet
      if (network.chainId !== expectedChainId) {
        alert(`Please switch to Base Mainnet (current network: ${network.name})`);
        return;
      }
      const balance = await signer.getBalance();
      const minBalance = ethers.utils.parseEther('0.0001');
      if (balance.lt(minBalance)) {
        alert('Insufficient ETH balance for donation (need at least 0.0001 ETH + gas).');
        return;
      }
      const tx = await signer.sendTransaction({
        to: '0xe9B0585Ea75a58752744F716F3Aae03509EC5a41',
        value: ethers.utils.parseEther('0.0001'),
      });
      await tx.wait();
      setLives(3);
      setLastLifeUpdate(new Date().toISOString());
      setLastDonateTimestamp(Date.now().toString());
      setLastRoundTimestamp('0');
      setGameOver(false);
      setShowFinalScreen(false);
      setShowGameOverPrompt(false);
      setFeedback('');
      setFeedbackImage('');
      localStorage.setItem(getStorageKey('lives'), '3');
      localStorage.setItem(getStorageKey('lastLifeUpdate'), new Date().toISOString());
      localStorage.setItem(getStorageKey('lastDonateTimestamp'), Date.now().toString());
      localStorage.setItem(getStorageKey('lastRoundTimestamp'), '0');
      localStorage.setItem(getStorageKey('gameOver'), 'false');
      localStorage.setItem(getStorageKey('showFinalScreen'), 'false');
      localStorage.setItem(getStorageKey('showGameOverPrompt'), 'false');
      alert('Lives restored! Thank you for your donation!');
    } catch (error: unknown) {
      console.error('Donate error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Donation failed: ${message}`);
    }
  };

  const canCast = () => {
    const now = Date.now();
    const lastCast = parseInt(lastCastTimestamp) || 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return now - lastCast >= oneDayInMs;
  };

  const handleCast = () => {
    if (!canCast()) {
      alert('You can only restore a life via Farcaster cast once per day!');
      return;
    }
    const inviteLink = 'https://crypto-quiz-9toy.vercel.app';
    const castText = `Join me in the Blockchain Brainteaser quiz on Farcaster! Test your crypto knowledge: ${inviteLink} #BlockchainBrainteaser`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}`, '_blank');
    setTimeout(() => {
      setLives(prev => {
        const newLives = Math.min(prev + 1, 3);
        localStorage.setItem(getStorageKey('lives'), newLives.toString());
        return newLives;
      });
      setLastLifeUpdate(new Date().toISOString());
      setLastCastTimestamp(Date.now().toString());
      setLastRoundTimestamp('0');
      setGameOver(false);
      setShowFinalScreen(false);
      setShowGameOverPrompt(false);
      setFeedback('');
      setFeedbackImage('');
      localStorage.setItem(getStorageKey('lastLifeUpdate'), new Date().toISOString());
      localStorage.setItem(getStorageKey('lastCastTimestamp'), Date.now().toString());
      localStorage.setItem(getStorageKey('lastRoundTimestamp'), '0');
      localStorage.setItem(getStorageKey('gameOver'), 'false');
      localStorage.setItem(getStorageKey('showFinalScreen'), 'false');
      localStorage.setItem(getStorageKey('showGameOverPrompt'), 'false');
      alert('Life restored! Thanks for casting!');
    }, 5000);
  };

  const shuffleOptions = (options: string[], correctIndex: number) => {
    const shuffled = [...options];
    const correctAnswer = options[correctIndex];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const newCorrectIndex = shuffled.indexOf(correctAnswer);
    return { shuffled, newCorrectIndex };
  };

  const getSetIndex = () => {
    const today = new Date();
    const startDate = new Date('2025-05-03');
    const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysPassed % questionSets.length;
  };

  const [currentSetIndex, setCurrentSetIndex] = useState(getSetIndex());

  const selectedQuestions = questionSets[currentSetIndex]
    .sort((a, b) => a.difficulty - b.difficulty)
    .map(q => {
      const { shuffled, newCorrectIndex } = shuffleOptions(q.options, q.correct);
      return { ...q, options: shuffled, correct: newCorrectIndex };
    });

  const getMultiplier = () => {
    const lastVisit = localStorage.getItem(getStorageKey('lastVisit'));
    const streakDays = parseInt(localStorage.getItem(getStorageKey('streakDays')) || '0');
    const today = new Date().toDateString();

    if (!lastVisit || streakDays === 0) {
      localStorage.setItem(getStorageKey('streakDays'), '0');
      localStorage.setItem(getStorageKey('lastVisit'), today);
      return 1.0;
    } else if (lastVisit !== today) {
      const newStreak = streakDays + 1;
      localStorage.setItem(getStorageKey('streakDays'), newStreak.toString());
      localStorage.setItem(getStorageKey('lastVisit'), today);
      return Math.min(1 + newStreak * 0.1, 5);
    }
    return Math.min(1 + streakDays * 0.1, 5);
  };

  const [multiplier, setMultiplier] = useState(getMultiplier());

  const getTimeUntilNextLife = () => {
    const now = new Date();
    const lastUpdate = new Date(lastLifeUpdate);
    const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = 4 - hoursPassed;
    return hoursRemaining > 0 ? Math.ceil(hoursRemaining * 60) : 0;
  };

  const canPlayRound = () => {
    const now = Date.now();
    const lastRound = parseInt(lastRoundTimestamp) || 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return now - lastRound >= oneDayInMs;
  };

  const getTimeUntilNextRound = () => {
    const now = Date.now();
    const lastRound = parseInt(lastRoundTimestamp) || 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const timeRemaining = oneDayInMs - (now - lastRound);
    return timeRemaining > 0 ? Math.ceil(timeRemaining / (1000 * 60)) : 0;
  };

  useEffect(() => {
    const checkLifeUpdate = () => {
      const now = new Date();
      const lastUpdate = new Date(lastLifeUpdate);
      const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      if (hoursPassed >= 4 && lives < 3) {
        const newLives = Math.min(lives + 1, 3);
        setLives(newLives);
        localStorage.setItem(getStorageKey('lives'), newLives.toString());
        localStorage.setItem(getStorageKey('lastLifeUpdate'), new Date().toISOString());
        if (newLives > 0) {
          setGameOver(false);
          setShowFinalScreen(false);
          setShowGameOverPrompt(false);
          setFeedback('');
          setFeedbackImage('');
          setLastRoundTimestamp('0');
          localStorage.setItem(getStorageKey('lastRoundTimestamp'), '0');
          localStorage.setItem(getStorageKey('gameOver'), 'false');
          localStorage.setItem(getStorageKey('showFinalScreen'), 'false');
          localStorage.setItem(getStorageKey('showGameOverPrompt'), 'false');
        }
      }
    };

    checkLifeUpdate();
    const interval = setInterval(checkLifeUpdate, 60 * 1000);
    return () => clearInterval(interval);
  }, [lives, lastLifeUpdate, address]);

  useEffect(() => {
    if (address) {
      localStorage.setItem(getStorageKey('currentQuestion'), currentQuestion.toString());
      localStorage.setItem(getStorageKey('score'), score.toString());
      localStorage.setItem(getStorageKey('totalScore'), totalScore.toString());
      localStorage.setItem(getStorageKey('lives'), lives.toString());
      localStorage.setItem(getStorageKey('gameOver'), JSON.stringify(gameOver));
      localStorage.setItem(getStorageKey('showFinalScreen'), JSON.stringify(showFinalScreen));
      localStorage.setItem(getStorageKey('showGameOverPrompt'), JSON.stringify(showGameOverPrompt));
    }
  }, [currentQuestion, score, totalScore, lives, gameOver, showFinalScreen, showGameOverPrompt, address]);

  const handleAnswer = (index: number) => {
    if (gameOver || showFinalScreen || showGameOverPrompt || isAnswering) return;
    setIsAnswering(true);

    let newLives = lives;
    if (index === selectedQuestions[currentQuestion].correct) {
      const newScore = score + 10 * multiplier;
      setScore(newScore);
      setTotalScore(prev => {
        const updatedTotal = prev + 10 * multiplier;
        localStorage.setItem(getStorageKey('totalScore'), updatedTotal.toString());
        return updatedTotal;
      });
      setFeedback('Correct!');
      setFeedbackImage('/rocker.png');
    } else {
      newLives = lives - 1;
      setLives(newLives);
      localStorage.setItem(getStorageKey('lives'), newLives.toString());
      setFeedback('Wrong!');
      setFeedbackImage('/bear.png');
    }

    if (currentQuestion + 1 === maxQuestions || newLives <= 0) {
      setTimeout(() => {
        setGameOver(true);
        setShowFinalScreen(true);
        setShowGameOverPrompt(newLives <= 0);
        setLastRoundTimestamp(Date.now().toString());
        setFeedback(newLives <= 0 ? 'Game Over!' : 'Round Completed!');
        setFeedbackImage(newLives <= 0 ? '/bear.png' : '/bull.png');
        localStorage.setItem(getStorageKey('gameOver'), 'true');
        localStorage.setItem(getStorageKey('showFinalScreen'), 'true');
        localStorage.setItem(getStorageKey('showGameOverPrompt'), JSON.stringify(newLives <= 0));
        localStorage.setItem(getStorageKey('lastRoundTimestamp'), Date.now().toString());
        setIsAnswering(false);
      }, 1500);
    } else {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setFeedback('');
        setFeedbackImage('');
        setIsAnswering(false);
      }, 1500);
    }
  };

  const handleRestart = () => {
    if (lives <= 0 || !canPlayRound()) return;
    setCurrentQuestion(0);
    setScore(0);
    setLives(3);
    setFeedback('');
    setFeedbackImage('');
    setGameOver(false);
    setShowFinalScreen(false);
    setShowGameOverPrompt(false);
    setCurrentSetIndex(getSetIndex());
    localStorage.setItem(getStorageKey('currentQuestion'), '0');
    localStorage.setItem(getStorageKey('score'), '0');
    localStorage.setItem(getStorageKey('lives'), '3');
    localStorage.setItem(getStorageKey('gameOver'), 'false');
    localStorage.setItem(getStorageKey('showFinalScreen'), 'false');
    localStorage.setItem(getStorageKey('showGameOverPrompt'), 'false');
    localStorage.setItem(getStorageKey('lastLifeUpdate'), new Date().toISOString());
    setLastRoundTimestamp('0');
    localStorage.setItem(getStorageKey('lastRoundTimestamp'), '0');
  };

  useEffect(() => {
    setMultiplier(getMultiplier());
  }, [address]);

  return (
    <div>
      <h1>Blockchain Brainteaser</h1>
      {!address && (
        <div>
          <p>Please connect your wallet to play!</p>
          <button onClick={handleConnect}>Connect Wallet</button>
        </div>
      )}
      {address && (
        <div>
          <p>Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
          <button onClick={handleDisconnect}>Disconnect Wallet</button>
        </div>
      )}
      {address && showGameOverPrompt ? (
        <div>
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Total Score: {totalScore}</p>
          <p>Want to continue playing?</p>
          <img src="/bear.png" alt="game over" style={{ width: '100px' }} />
          <p>Wait for lives to restore (~{getTimeUntilNextLife()} min)</p>
          {canDonate() && <button onClick={handleDonate}>Restore Lives (0.0001 ETH)</button>}
          {canCast() && <button onClick={handleCast}>Cast on Farcaster for 1 Life</button>}
        </div>
      ) : address && (!gameOver || !showFinalScreen) ? (
        <div>
          <h2>Question {currentQuestion + 1}</h2>
          <p>{selectedQuestions[currentQuestion].text}</p>
          {selectedQuestions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={!canPlayRound() || isAnswering}
            >
              {option}
            </button>
          ))}
          {feedback && (
            <div>
              <p>{feedback}</p>
              <img src={feedbackImage} alt="feedback" style={{ width: '100px' }} />
            </div>
          )}
          <p>Score: {score}</p>
          <p>Total Score: {totalScore}</p>
          <p>Lives: {lives}</p>
          <p>Multiplier: x{multiplier.toFixed(1)}</p>
          <p>
            {lives < 3
              ? `Next life in ~${getTimeUntilNextLife()} min`
              : 'Lives full!'}
          </p>
          {lives === 0 && (
            <>
              {canDonate() && <button onClick={handleDonate}>Restore Lives (0.0001 ETH)</button>}
              {canCast() && <button onClick={handleCast}>Cast on Farcaster for 1 Life</button>}
            </>
          )}
          {!canPlayRound() && (
            <p>Next round in ~{getTimeUntilNextRound()} min</p>
          )}
        </div>
      ) : address && (
        <div>
          <h2>{feedback}</h2>
          <img src={feedbackImage} alt="feedback" style={{ width: '100px' }} />
          <p>Final Score: {score}</p>
          <p>Total Score: {totalScore}</p>
          {lives === 0 ? (
            <>
              <p>Want to continue playing?</p>
              <p>Wait for lives to restore (~{getTimeUntilNextLife()} min)</p>
              {canDonate() && <button onClick={handleDonate}>Restore Lives (0.0001 ETH)</button>}
              {canCast() && <button onClick={handleCast}>Cast on Farcaster for 1 Life</button>}
            </>
          ) : !canPlayRound() ? (
            <p>Next round in ~{getTimeUntilNextRound()} min</p>
          ) : (
            <button onClick={handleRestart}>Start Over</button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

