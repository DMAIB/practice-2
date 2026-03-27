import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Начальные данные
  const getInitialFarm = () => {
    const plots = [];
    for (let i = 0; i < 9; i++) {
      plots.push({
        id: i,
        type: i < 4 ? 'field' : 'locked',
        status: 'empty',
        time: null
      });
    }
    return plots;
  };

  const getInitialPastures = () => {
    return [
      { id: 0, name: 'Луговина', price: 250, owned: false, level: 1, maxLevel: 5,
        upgradeCost: {1:180,2:260,3:380,4:550},
        rent: {1:20,2:28,3:38,4:50,5:65} },
      { id: 1, name: 'Зелёный склон', price: 600, owned: false, level: 1, maxLevel: 6,
        upgradeCost: {1:420,2:620,3:900,4:1300,5:1900},
        rent: {1:55,2:72,3:95,4:125,5:160,6:200} },
      { id: 2, name: 'Речная пойма', price: 1400, owned: false, level: 1, maxLevel: 7,
        upgradeCost: {1:950,2:1400,3:2100,4:3100,5:4700,6:7000},
        rent: {1:140,2:180,3:235,4:300,5:380,6:470,7:580} },
      { id: 3, name: 'Горное плато', price: 3200, owned: false, level: 1, maxLevel: 8,
        upgradeCost: {1:2200,2:3200,3:4800,4:7200,5:10800,6:16200,7:24000},
        rent: {1:320,2:410,3:520,4:660,5:830,6:1030,7:1270,8:1560} }
    ];
  };

  // Состояния
  const [farm, setFarm] = useState(() => {
    const saved = localStorage.getItem('farm');
    return saved ? JSON.parse(saved) : getInitialFarm();
  });

  const [pastures, setPastures] = useState(() => {
    const saved = localStorage.getItem('pastures');
    return saved ? JSON.parse(saved) : getInitialPastures();
  });

  const [money, setMoney] = useState(() => {
    const saved = localStorage.getItem('money');
    return saved ? Number(saved) : 0;
  });
  
  const [harvestCount, setHarvestCount] = useState(() => {
    const saved = localStorage.getItem('harvestCount');
    return saved ? Number(saved) : 0;
  });
  
  const [speed, setSpeed] = useState(() => {
    const saved = localStorage.getItem('speed');
    return saved ? Number(saved) : 1;
  });

  const [lastRentTime, setLastRentTime] = useState(() => {
    const saved = localStorage.getItem('lastRentTime');
    return saved ? Number(saved) : Date.now();
  });

  const [isTabActive, setIsTabActive] = useState(true);
  const rentIntervalRef = useRef(null);

  // Сохраняем игру
  useEffect(() => {
    localStorage.setItem('farm', JSON.stringify(farm));
    localStorage.setItem('pastures', JSON.stringify(pastures));
    localStorage.setItem('money', money);
    localStorage.setItem('harvestCount', harvestCount);
    localStorage.setItem('speed', speed);
    localStorage.setItem('lastRentTime', lastRentTime);
  }, [farm, pastures, money, harvestCount, speed, lastRentTime]);

  // Рента каждую секунду
  useEffect(() => {
    if (isTabActive) {
      rentIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const hourMs = 10000 / speed; // 10 секунд в игре = 1 час
        
        if (now - lastRentTime >= hourMs) {
          // Считаем ренту
          let totalRent = 0;
          pastures.forEach(p => {
            if (p.owned) totalRent += p.rent[p.level];
          });
          
          if (totalRent > 0) {
            setMoney(prev => prev + totalRent);
          }
          setLastRentTime(prev => prev + hourMs);
        }
      }, 1000);
    }
    
    return () => {
      if (rentIntervalRef.current) clearInterval(rentIntervalRef.current);
    };
  }, [isTabActive, lastRentTime, pastures, speed]);

  // Проверка роста растений
  useEffect(() => {
    if (!isTabActive) return;
    
    const interval = setInterval(() => {
      setFarm(prev => {
        const newFarm = [...prev];
        let changed = false;
        
        for (let i = 0; i < newFarm.length; i++) {
          if (newFarm[i].status === 'growing' && newFarm[i].time && Date.now() >= newFarm[i].time) {
            newFarm[i].status = 'ready';
            newFarm[i].time = null;
            changed = true;
          }
        }
        
        return changed ? newFarm : prev;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isTabActive]);

  // Следим за вкладкой
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      
      if (visible && !isTabActive) {
        // Если вернулись на вкладку, сбрасываем растущие растения
        setFarm(prev => {
          const newFarm = [...prev];
          for (let i = 0; i < newFarm.length; i++) {
            if (newFarm[i].status === 'growing') {
              newFarm[i].status = 'empty';
              newFarm[i].time = null;
            }
          }
          return newFarm;
        });
        setLastRentTime(Date.now());
      }
      
      setIsTabActive(visible);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTabActive]);

  // Функции игры
  const buyPasture = (id) => {
    const pasture = pastures[id];
    if (!pasture.owned && money >= pasture.price) {
      setMoney(money - pasture.price);
      const newPastures = [...pastures];
      newPastures[id].owned = true;
      setPastures(newPastures);
    } else if (!pasture.owned) {
      alert(`Нужно ${pasture.price} монет!`);
    }
  };

  const upgradePasture = (id) => {
    const pasture = pastures[id];
    if (pasture.owned && pasture.level < pasture.maxLevel) {
      const cost = pasture.upgradeCost[pasture.level];
      if (money >= cost) {
        setMoney(money - cost);
        const newPastures = [...pastures];
        newPastures[id].level++;
        setPastures(newPastures);
      } else {
        alert(`Нужно ${cost} монет!`);
      }
    }
  };

  const plantSeed = (id) => {
    setFarm(prev => {
      const newFarm = [...prev];
      if (newFarm[id].type === 'field' && newFarm[id].status === 'empty') {
        newFarm[id].status = 'planted';
        
        setTimeout(() => {
          setFarm(currentFarm => {
            const updated = [...currentFarm];
            if (updated[id] && updated[id].status === 'planted') {
              updated[id].status = 'growing';
              updated[id].time = Date.now() + (10000 / speed);
            }
            return updated;
          });
        }, 500);
      }
      return newFarm;
    });
  };

  const harvest = (id) => {
    setFarm(prev => {
      const newFarm = [...prev];
      if (newFarm[id].status === 'ready') {
        newFarm[id].status = 'empty';
        setMoney(m => m + 50);
        setHarvestCount(c => c + 1);
      }
      return newFarm;
    });
  };

  const buyField = (id) => {
    if (money >= 100) {
      setFarm(prev => {
        const newFarm = [...prev];
        if (newFarm[id].type === 'locked') {
          newFarm[id].type = 'field';
          newFarm[id].status = 'empty';
          setMoney(m => m - 100);
        }
        return newFarm;
      });
    } else {
      alert('Нужно 100 монет!');
    }
  };

  const handlePlotClick = (plot, id) => {
    if (!isTabActive) {
      alert('Игра остановлена! Переключитесь на вкладку.');
      return;
    }
    
    if (plot.type === 'locked') buyField(id);
    else if (plot.status === 'empty') plantSeed(id);
    else if (plot.status === 'ready') harvest(id);
  };

  // Вспомогательные функции
  const getEmoji = (plot) => {
    if (plot.type === 'locked') return '🔒';
    if (plot.status === 'empty') return '🌱';
    if (plot.status === 'planted') return '🌱✨';
    if (plot.status === 'growing') return '🌻';
    if (plot.status === 'ready') return '⭐';
    return '⬜';
  };

  const getTimeLeft = (plot) => {
    if (plot.status === 'growing' && plot.time) {
      const left = Math.ceil((plot.time - Date.now()) / 1000);
      if (left > 0) {
        const mins = Math.floor(left / 60);
        const secs = left % 60;
        return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;
      }
    }
    return null;
  };

  const getPlotText = (plot) => {
    if (plot.type === 'locked') return 'Купить 100💰';
    if (plot.status === 'empty') return 'Посадить';
    if (plot.status === 'planted') return '🌱 Посажено!';
    if (plot.status === 'growing') {
      const time = getTimeLeft(plot);
      return time ? `Растет ${time}` : 'Растет...';
    }
    if (plot.status === 'ready') return 'Собрать +50💰';
    return '';
  };

  // Считаем ренту для отображения
  let totalRent = 0;
  pastures.forEach(p => {
    if (p.owned) totalRent += p.rent[p.level];
  });

  const resetGame = () => {
    if (window.confirm('Сбросить игру?')) {
      setFarm(getInitialFarm());
      setPastures(getInitialPastures());
      setMoney(0);
      setHarvestCount(0);
      setSpeed(1);
      setLastRentTime(Date.now());
    }
  };

  return (
    <div className="app">
      <h1>🌾 Ферма 🚜</h1>
      
      {!isTabActive && (
        <div className="inactive-warning">
          ⏸️ Игра остановлена! Переключитесь на вкладку ⏸️
        </div>
      )}
      
      <div className="stats">
        <div>💰 {Math.floor(money)}</div>
        <div>🌽 {harvestCount}</div>
        <div>💵 Рента: {totalRent}/час</div>
        
        <div>
          <button onClick={() => setSpeed(0.5)} className={speed === 0.5 ? 'active' : ''}>🐢 0.5x</button>
          <button onClick={() => setSpeed(1)} className={speed === 1 ? 'active' : ''}>⚡ 1x</button>
          <button onClick={() => setSpeed(2)} className={speed === 2 ? 'active' : ''}>🚀 2x</button>
          <button onClick={() => setSpeed(4)} className={speed === 4 ? 'active' : ''}>🔥 4x</button>
          <button onClick={resetGame} className="reset-button">🔄 Сброс</button>
        </div>
      </div>

      {/* Пастбища */}
      <div className="pastures">
        <h2>🐄 Пастбища</h2>
        <div className="pastures-list">
          {pastures.map((p, i) => (
            <div key={i} className={`pasture ${p.owned ? 'owned' : ''}`}>
              <h3>{p.name}</h3>
              {!p.owned ? (
                <>
                  <p>Цена: {p.price}💰</p>
                  <button onClick={() => buyPasture(i)}>Купить</button>
                </>
              ) : (
                <>
                  <p>Уровень: {p.level}/{p.maxLevel}</p>
                  <p>Рента: {p.rent[p.level]}💰/час</p>
                  {p.level < p.maxLevel && (
                    <>
                      <p>Апгрейд: {p.upgradeCost[p.level]}💰</p>
                      <button onClick={() => upgradePasture(i)}>Улучшить</button>
                    </>
                  )}
                  {p.level === p.maxLevel && <p>⭐ МАКС ⭐</p>}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Поля */}
      <h2>🌻 Поля</h2>
      <div className="grid">
        {farm.map((plot, i) => (
          <div
            key={i}
            className={`plot ${plot.type} ${plot.status}`}
            onClick={() => handlePlotClick(plot, i)}
          >
            <div className="emoji">{getEmoji(plot)}</div>
            <div className="hint">{getPlotText(plot)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;