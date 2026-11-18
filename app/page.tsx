'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'info' | 'concern' | 'style' | 'chat' | 'wardrobe' | 'avatar' | 'taste' | 'calendar' | 'cart' | 'mypage'
  >('landing');

  const [centerLoaded, setCenterLoaded] = useState(false);
  const [restLoaded, setRestLoaded] = useState(false);

  // 1. 앱이 처음 켜질 때 localStorage 확인
  useEffect(() => {
    const isCompleted = localStorage.getItem('showMe_onboarding_done');
    if (isCompleted === 'true') {
      setCurrentView('chat');
    }
  }, []);

  useEffect(() => {
    if (currentView === 'landing') {
      setCenterLoaded(false);
      setRestLoaded(false);
      const t1 = setTimeout(() => setCenterLoaded(true), 50);
      const t2 = setTimeout(() => setRestLoaded(true), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [currentView]);

  const completeOnboarding = () => {
    localStorage.setItem('showMe_onboarding_done', 'true');
    setCurrentView('chat');
  };

  // --- 온보딩 입력 상태 ---
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState('여성');
  const [height, setHeight] = useState('176');
  const [weight, setWeight] = useState('55');
  const [personalColor, setPersonalColor] = useState('가을 웜');

  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['코디 조언']);
  const [otherText, setOtherText] = useState('');

  const toggleConcern = (item: string) => {
    if (selectedConcerns.includes(item)) {
      setSelectedConcerns(selectedConcerns.filter((c) => c !== item));
    } else {
      setSelectedConcerns([...selectedConcerns, item]);
    }
  };

  const [selectedStyles, setSelectedStyles] = useState<number[]>([0, 1]);
  const toggleStyle = (index: number) => {
    if (selectedStyles.includes(index)) {
      setSelectedStyles(selectedStyles.filter((i) => i !== index));
    } else {
      setSelectedStyles([...selectedStyles, index]);
    }
  };

  // --- 채팅 및 스크랩 상태 ---
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; id: number }>>([
    { sender: 'user', text: '다음 주 첫 출근인데 뭘 입어야 할까?\n너무 격식 차린 느낌은 싫어.', id: 1 },
    { sender: 'ai', text: '첫 출근, 설레면서도 고민되죠.\n우선 옷장에 있는 셔츠와 가디건, 슬랙스 조합으로 단정하면서도 편안한 스타일을 시작해보세요!', id: 2 }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [scraps, setScraps] = useState<string[]>([]);

  const toggleScrap = (text: string) => {
    if (scraps.includes(text)) {
      setScraps(scraps.filter(s => s !== text));
    } else {
      setScraps([...scraps, text]);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const userText = inputMessage;
    setMessages(prev => [...prev, { sender: 'user', text: userText, id: Date.now() }]);
    setInputMessage('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: `"${userText}"에 대한 맞춤형 추천 결과예요!`, id: Date.now() + 1 }
      ]);
    }, 600);
  };

  // --- 옷장 탭 상태 ---
  const [wardrobeTab, setWardrobeTab] = useState<'전체' | '상의' | '하의' | '가방'>('전체');

  // --- 캘린더 탭 상태 ---
  const [selectedBrands, setSelectedBrands] = useState<string[]>(['브랜드 A', '브랜드 B']);
  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-4 text-[#3E3238]">
      <div className="w-full max-w-[420px] min-h-[840px] bg-[#FBF9F5] rounded-3xl shadow-2xl flex flex-col justify-between p-6 relative overflow-hidden border border-[#EFECE6]">
        
        {/* ================= 1단계: 랜딩 화면 ================= */}
        {currentView === 'landing' && (
          <div className="flex flex-col justify-between h-full flex-1 py-4">
            <div className={`flex justify-between items-center transition-all duration-700 ease-out ${restLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xl font-serif font-bold text-[#634753] tracking-tight">Show Me</span>
              <span className="text-xs text-[#8A7982] tracking-wider">나다움을 찾는 여정</span>
            </div>

            <div className={`flex flex-col items-center text-center space-y-4 my-auto transition-all duration-700 ease-out transform ${centerLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A7982]">Less Scrolling, More You</p>
              <div className="space-y-1">
                <p className="text-base text-[#594852] font-medium">당신의 쇼핑 메이트,</p>
                <h1 className="text-4xl font-serif font-bold text-[#3E3238] tracking-tight">Show Me</h1>
              </div>
              <p className="text-sm text-[#7A6B73] leading-relaxed pt-2">
                뭘 입을지 막막한 순간부터<br />나답게 고를 수 있는 순간까지.
              </p>
            </div>

            <div className={`space-y-3 transition-all duration-700 ease-out ${restLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <button
                onClick={() => setCurrentView('info')}
                className="w-full bg-[#634753] hover:bg-[#523944] text-white font-medium py-4 px-6 rounded-2xl shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                나의 쇼핑메이트 만나기
              </button>
              <p className="text-center text-xs text-[#9E8E97]">나답게 고르는 연습, 여기서 시작해요.</p>
            </div>
          </div>
        )}

        {/* ================= 2단계: 나의 기본 정보 화면 (01/03) ================= */}
        {currentView === 'info' && (
          <div className="flex flex-col justify-between h-full flex-1 py-2 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-3">
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="text-[#634753] text-sm font-medium flex items-center gap-1 hover:opacity-75 transition"
                >
                  〈 뒤로
                </button>
                <span className="text-xs font-semibold text-[#8A7982] tracking-widest">01 / 03</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#E5E0D8] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#E5E0D8] transition-all duration-300" />
              </div>

              <div className="space-y-2 mb-6">
                <h2 className="text-2xl font-serif font-bold text-[#3E3238] leading-snug">
                  당신을 조금만<br />알려주세요.
                </h2>
                <p className="text-xs text-[#7A6B73] leading-relaxed">
                  잘 몰라도 괜찮아요. 아는 만큼만 입력하면 추천을 시작할 수 있어요.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-medium text-[#594852] mb-1">나이 (만)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm text-[#3E3238] focus:outline-none focus:border-[#634753] transition"
                    />
                    <span className="absolute right-4 top-3.5 text-xs text-[#9E8E97]">세</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#594852] mb-1">성별</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['여성', '남성', '선택 안 함'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2.5 rounded-xl text-xs font-medium border transition ${
                          gender === g
                            ? 'bg-[#EFE8EC] border-[#634753] text-[#634753]'
                            : 'bg-white border-[#E5E0D8] text-[#7A6B73] hover:bg-[#F7F4F0]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#594852] mb-1">키</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm text-[#3E3238] focus:outline-none focus:border-[#634753] transition"
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-[#9E8E97]">cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#594852] mb-1">몸무게</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm text-[#3E3238] focus:outline-none focus:border-[#634753] transition"
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-[#9E8E97]">kg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#594852] mb-1">퍼스널 컬러</label>
                  <div className="flex flex-wrap gap-2">
                    {['봄 웜', '여름 쿨', '가을 웜', '겨울 쿨', '아직 잘 모르겠어요'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPersonalColor(color)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                          personalColor === color
                            ? 'bg-[#EFE8EC] border-[#634753] text-[#634753]'
                            : 'bg-white border-[#E5E0D8] text-[#7A6B73] hover:bg-[#F7F4F0]'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#F3EFEA] rounded-xl p-3 text-[11px] text-[#7A6B73] leading-snug">
                  모든 항목은 선택 사항이에요.<br />
                  입력한 정보는 맞춤 추천에 활용되며, 나중에 언제든 수정하거나 삭제할 수 있어요.
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setCurrentView('concern')}
                className="w-full bg-[#634753] hover:bg-[#523944] text-white font-medium py-3.5 px-6 rounded-2xl shadow-md transition-all duration-200"
              >
                다음
              </button>
              <div className="text-center">
                <button 
                  onClick={() => setCurrentView('concern')}
                  className="text-xs text-[#8A7982] hover:underline"
                >
                  지금은 건너뛰기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3단계: 패션 고민 선택 화면 (02/03) ================= */}
        {currentView === 'concern' && (
          <div className="flex flex-col justify-between h-full flex-1 py-2 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-3">
                <button 
                  onClick={() => setCurrentView('info')}
                  className="text-[#634753] text-sm font-medium flex items-center gap-1 hover:opacity-75 transition"
                >
                  〈 뒤로
                </button>
                <span className="text-xs font-semibold text-[#8A7982] tracking-widest">02 / 03</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#E5E0D8] transition-all duration-300" />
              </div>

              <div className="space-y-2 mb-5">
                <h2 className="text-2xl font-serif font-bold text-[#3E3238] leading-snug">
                  어떤 고민을<br />함께 풀어볼까요?
                </h2>
                <p className="text-xs text-[#7A6B73] leading-relaxed">
                  지금 가장 궁금한 걸 골라주세요.<br />여러 개 선택해도 괜찮아요.
                </p>
              </div>

              <div className="space-y-3 text-left">
                {[
                  { id: '01', title: '코디 조언', desc: '상황에 맞게, 가진 옷부터 활용해요.' },
                  { id: '02', title: '사이즈·핏 고민', desc: '잘 맞는 옷과 실측을 비교해 봐요.' },
                  { id: '03', title: '스타일 찾기', desc: '유행보다 나에게 어울리는 방향을 찾아요.' },
                ].map((item) => {
                  const isSelected = selectedConcerns.includes(item.title);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleConcern(item.title)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-[#F2EDEE] border-[#634753]' 
                          : 'bg-white border-[#E5E0D8] hover:border-[#D1C8C0]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-serif text-[#8A7982] mt-0.5">{item.id}</span>
                        <div>
                          <p className="text-sm font-bold text-[#3E3238]">{item.title}</p>
                          <p className="text-xs text-[#7A6B73] mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span className="text-[#634753] font-bold text-sm">
                        {isSelected ? '✓' : '+'}
                      </span>
                    </div>
                  );
                })}

                <div 
                  onClick={() => toggleConcern('기타')}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    selectedConcerns.includes('기타') 
                      ? 'bg-[#F2EDEE] border-[#634753]' 
                      : 'bg-white border-[#E5E0D8] hover:border-[#D1C8C0]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-serif text-[#8A7982] mt-0.5">04</span>
                      <div>
                        <p className="text-sm font-bold text-[#3E3238]">기타</p>
                        <p className="text-xs text-[#7A6B73] mt-0.5">어떤 고민이든 편하게 이야기해요.</p>
                      </div>
                    </div>
                    <span className="text-[#634753] font-bold text-sm">
                      {selectedConcerns.includes('기타') ? '✓' : '+'}
                    </span>
                  </div>

                  <textarea
                    value={otherText}
                    onChange={(e) => {
                      e.stopPropagation();
                      setOtherText(e.target.value);
                      if (!selectedConcerns.includes('기타')) {
                        setSelectedConcerns([...selectedConcerns, '기타']);
                      }
                    }}
                    placeholder="고민이나 요청 사항을 자유롭게 적어 주세요."
                    className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#3E3238] focus:outline-none focus:border-[#634753] resize-none h-16"
                  />
                </div>

                <p className="text-[11px] text-[#8A7982] text-center pt-1 leading-relaxed">
                  패션을 잘 몰라도 괜찮아요.<br />
                  정답을 고르는 게 아니라, 나만의 기준을 함께 만들어 가는 거예요.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setCurrentView('style')}
                className="w-full bg-[#634753] hover:bg-[#523944] text-white font-medium py-3.5 px-6 rounded-2xl shadow-md transition-all duration-200"
              >
                다음
              </button>
              <div className="text-center">
                <button 
                  onClick={() => setCurrentView('style')}
                  className="text-xs text-[#8A7982] hover:underline"
                >
                  지금은 건너뛰기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4단계: 좋아하는 스타일 선택 화면 (03/03) ================= */}
        {currentView === 'style' && (
          <div className="flex flex-col justify-between h-full flex-1 py-2 animate-fadeIn overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-3">
                <button 
                  onClick={() => setCurrentView('concern')}
                  className="text-[#634753] text-sm font-medium flex items-center gap-1 hover:opacity-75 transition"
                >
                  〈 뒤로
                </button>
                <span className="text-xs font-semibold text-[#8A7982] tracking-widest">03 / 03</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
                <div className="h-[2.5px] rounded-full bg-[#634753] transition-all duration-300" />
              </div>

              <div className="space-y-1 mb-4">
                <h2 className="text-2xl font-serif font-bold text-[#3E3238] leading-snug">
                  눈길이 가는 스타일을<br />골라보세요.
                </h2>
                <p className="text-xs text-[#7A6B73] leading-relaxed">
                  이름을 몰라도 괜찮아요. 마음이 가는 사진부터!<br />
                  여러 개 선택할 수 있어요.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {Array.from({ length: 12 }).map((_, index) => {
                  const isSelected = selectedStyles.includes(index);
                  return (
                    <div
                      key={index}
                      onClick={() => toggleStyle(index)}
                      className={`relative aspect-[3/4] rounded-xl cursor-pointer transition-all flex items-center justify-center border-2 overflow-hidden ${
                        isSelected 
                          ? 'border-[#634753] bg-[#EFE8EC] shadow-sm' 
                          : 'border-[#E5E0D8] bg-[#F2EDE8] hover:border-[#CFC8BE]'
                      }`}
                    >
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-[#634753]' : 'text-[#A3959D]'}`}>
                        {isSelected ? '선택됨' : `사진 ${index + 1}`}
                      </span>
                      
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#634753] text-white rounded-full flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#8A7982] text-center leading-relaxed">
                아직 취향이 뚜렷하지 않아도 괜찮아요.<br />
                건너뛰어도 나중에 '취향 찾기' 탭에서 언제든 다시 선택할 수 있어요.
              </p>
            </div>

            <div className="mt-4 space-y-2 pt-2">
              <button
                onClick={completeOnboarding}
                className="w-full bg-[#634753] hover:bg-[#523944] text-white font-medium py-3.5 px-6 rounded-2xl shadow-md transition-all duration-200"
              >
                쇼핑메이트와 시작하기
              </button>
              <div className="text-center">
                <button 
                  onClick={completeOnboarding}
                  className="text-xs text-[#8A7982] hover:underline"
                >
                  지금은 건너뛰기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5단계: 쇼핑메이트 채팅 화면 (메인 홈) ================= */}
        {currentView === 'chat' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-16 overflow-y-auto pr-1">
            <div className="flex justify-between items-center py-2 mb-2">
              <h1 className="text-xl font-serif font-bold text-[#3E3238]">쇼핑메이트</h1>
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('cart')} className="p-1">🛒</button>
                <button onClick={() => setCurrentView('mypage')} className="p-1">👤</button>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[#3E3238] flex-1 overflow-y-auto">
              <div className="text-center text-[11px] text-[#8A7982] my-2">첫 출근 상담 · 예시</div>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="bg-[#634753] text-white rounded-2xl rounded-tr-sm p-3.5 max-w-[85%] text-xs shadow-sm whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="space-y-3 w-full">
                      <div className="text-[11px] text-[#8A7982] font-medium">Show Me · 나만의 쇼핑메이트</div>
                      <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm space-y-3">
                        <p className="text-xs text-[#3E3238] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <button onClick={() => toggleScrap(msg.text)} className={`text-[11px] px-3 py-1 rounded-full border transition ${scraps.includes(msg.text) ? 'bg-[#634753] text-white' : 'bg-[#FBF9F5] text-[#634753]'}`}>
                          {scraps.includes(msg.text) ? '★ 스크랩 완료됨' : '☆ 이 답변 스크랩하기'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                  <button className="w-7 h-7 bg-[#F3EFEA] rounded-full flex items-center justify-center text-[#634753] font-bold text-sm">+</button>
                  <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="고민이나 상품 링크를 보내주세요" className="w-full text-xs bg-transparent focus:outline-none" />
                </div>
                <button onClick={handleSendMessage} className="w-7 h-7 bg-[#634753] text-white rounded-full flex items-center justify-center">↑</button>
              </div>
            </div>
          </div>
        )}

        {/* ================= [1] 나의 옷장 화면 ================= */}
        {currentView === 'wardrobe' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-16 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-serif font-bold text-[#3E3238]">나의 옷장</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentView('cart')} className="p-1">🛒</button>
                  <button onClick={() => setCurrentView('mypage')} className="p-1">👤</button>
                </div>
              </div>

              {/* 상단 배너 카드 */}
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm mb-4 space-y-2">
                <p className="text-xs font-bold text-[#3E3238]">오늘의 옷, 옷장에 넣을까요?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="bg-[#F3EFEA] text-[#634753] text-[11px] py-2.5 px-3 rounded-xl font-medium border border-[#E5E0D8] text-center">
                    + 새 촬영하기
                  </button>
                  <button className="bg-[#F3EFEA] text-[#634753] text-[11px] py-2.5 px-3 rounded-xl font-medium border border-[#E5E0D8] text-center">
                    🔗 판매처 링크 입력
                  </button>
                </div>
                <p className="text-[10px] text-[#8A7982]">판매처 링크 · 실측 자동 입력, 사진 촬영 · 톡톡 측정 및 등록</p>
              </div>

              {/* 내 옷 요약 및 실측 상태 */}
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#3E3238]">내 옷 4</span>
                  <span className="text-[11px] text-[#8A7982]">최근 등록순 ↓</span>
                </div>
                <div className="bg-[#F9F7F2] rounded-xl p-3 space-y-2 border border-[#EFECE6]">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#3E3238]">★ 즐겨찾는 상의 기준</span>
                    <span className="text-[#634753]">0 / 1</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button className="bg-white border border-[#E5E0D8] text-[11px] py-2 rounded-lg text-[#634753] font-medium">
                      즐겨찾는 상의 실측입력하기
                    </button>
                    <button className="bg-white border border-[#E5E0D8] text-[11px] py-2 rounded-lg text-[#634753] font-medium">
                      즐겨찾는 하의 실측입력하기
                    </button>
                  </div>
                </div>
              </div>

              {/* 카테고리 탭 (전체, 상의, 하의, 가방) */}
              <div className="flex gap-2 mb-3 border-b border-[#EFECE6] pb-2">
                {(['전체', '상의', '하의', '가방'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setWardrobeTab(tab)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                      wardrobeTab === tab ? 'bg-[#634753] text-white' : 'bg-white text-[#7A6B73] border border-[#E5E0D8]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* 옷 카드 목록 */}
              <div className="grid grid-cols-2 gap-3 pb-4">
                {[
                  { name: '아이보리 세츠', tag: '사진 등록 · 실측 필요', type: '상의' },
                  { name: '네이비 가디건', tag: '핑크 등록 · 실측 자동 입력', type: '상의' },
                  { name: '블랙 슬랙스', tag: '광고 등록 · 기초 실측 완료', type: '하의' },
                  { name: '블랙 토트백', tag: '가방 · 사진 등록', type: '가방' },
                ]
                  .filter((item) => wardrobeTab === '전체' || item.type === wardrobeTab)
                  .map((item, idx) => (
                    <div key={idx} className="bg-white border border-[#E5E0D8] rounded-2xl p-3 shadow-sm space-y-2">
                      <div className="w-full h-24 bg-[#F3EFEA] rounded-xl flex items-center justify-center text-xs text-[#8A7982]">
                        {item.name} 이미지
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#3E3238]">{item.name}</p>
                        <p className="text-[10px] text-[#8A7982] mt-0.5">{item.tag}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= [2] 아바타 화면 ================= */}
        {currentView === 'avatar' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-16 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-xl font-serif font-bold text-[#3E3238]">나의 아바타</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentView('cart')} className="p-1">🛒</button>
                  <button onClick={() => setCurrentView('mypage')} className="p-1">👤</button>
                </div>
              </div>

              {/* 아바타 핏 기준 카드 */}
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#3E3238]">나를 닮은 핏의 기준</h3>
                    <p className="text-[10px] text-[#8A7982]">상단에서 체형을 확인하고, 아바타에서 내 옷을 살펴봐요.</p>
                  </div>
                  <span className="text-xs text-[#634753] font-medium">{height} cm / {weight} kg</span>
                </div>
                <div className="w-full h-36 bg-[#F3EFEA] rounded-xl flex flex-col items-center justify-center text-xs text-[#8A7982] border border-[#EFECE6]">
                  👤 3D 아바타 체형 렌더링 영역
                </div>
                <button className="w-full bg-[#F3EFEA] text-[#634753] text-xs py-2.5 rounded-xl font-medium border border-[#E5E0D8]">
                  아바타를 눌러 신체 치수 수정
                </button>
              </div>

              {/* 나의 디지털 옷장 및 피팅 버튼 */}
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#3E3238]">나의 디지털 옷장</span>
                  <span className="text-[11px] text-[#8A7982]">내 옷 4개 · ★ 즐겨찾는 기준 옷</span>
                </div>
                <button 
                  onClick={() => alert('입어보고 싶은 핏 피팅 링크 입력 모달이 열립니다!')}
                  className="w-full bg-[#634753] text-white text-xs py-3 rounded-xl font-medium shadow-sm"
                >
                  입어보고 싶은 핏 피팅하기 (링크 넣기)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= [3] 취향 찾기 화면 ================= */}
        {currentView === 'taste' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-16 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-xl font-serif font-bold text-[#3E3238]">취향 찾기</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentView('cart')} className="p-1">🛒</button>
                  <button onClick={() => setCurrentView('mypage')} className="p-1">👤</button>
                </div>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#3E3238]">좋아하는 장면을 모으면, 나만의 취향이 보여요.</h3>
                  <p className="text-[10px] text-[#8A7982]">마음에 가는 사진을 놀러보세요. (2개 선택)</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const isSelected = selectedStyles.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStyle(idx)}
                        className={`aspect-[3/4] rounded-xl cursor-pointer flex flex-col items-center justify-center p-2 text-center border-2 transition relative ${
                          isSelected ? 'border-[#634753] bg-[#EFE8EC]' : 'border-[#E5E0D8] bg-[#F2EDE8]'
                        }`}
                      >
                        <span className="text-[10px] font-medium text-[#7A6B73]">스타일 사진 {idx + 1}</span>
                        {isSelected && <span className="absolute top-1 right-1 text-[10px] bg-[#634753] text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>}
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => alert('취향 설정이 저장되었습니다!')} className="w-full bg-[#634753] text-white text-xs py-3 rounded-xl font-medium shadow-sm">
                  저장하기
                </button>
              </div>

              {/* 나의 취향 현황 분석 카드 */}
              <div className="bg-[#F3EFEA] border border-[#E5E0D8] rounded-2xl p-4 space-y-2 text-xs text-[#594852]">
                <p className="font-bold text-[#3E3238]">지금, 나의 취향 현황</p>
                <p><strong className="text-[#634753]">나의 추구미:</strong> 미니멀 · 캐주얼 (선택한 사진에서 주로 발견돼요)</p>
                <p><strong className="text-[#634753]">실제로 가장 많이 입는 스타일:</strong> 아직 알아가는 중</p>
                <p><strong className="text-[#634753]">퍼스널 데이터 기반 추천:</strong> 만만한 미니멀 · 예시</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= [4] 세일 캘린더 화면 ================= */}
        {currentView === 'calendar' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-16 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-xl font-serif font-bold text-[#3E3238]">세일 캘린더</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentView('cart')} className="p-1">🛒</button>
                  <button onClick={() => setCurrentView('mypage')} className="p-1">👤</button>
                </div>
              </div>

              {/* 브랜드 태그 필터 */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#3E3238]">좋아하는 브랜드, 좋은 타이밍에 만나요.</p>
                <div className="flex flex-wrap gap-1.5">
                  <button className="bg-[#634753] text-white text-[11px] px-3 py-1.5 rounded-full font-medium">+ 관심 브랜드</button>
                  {['브랜드 A', '브랜드 B', '브랜드 팹스터', '탐브린즈', '논픽션'].map((brand) => (
                    <button
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                        selectedBrands.includes(brand) ? 'bg-[#634753] text-white border-[#634753]' : 'bg-white text-[#7A6B73] border-[#E5E0D8]'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2026년 11월 캘린더 위젯 */}
              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-[#3E3238]">
                  <span>〈</span>
                  <span>2026년 11월</span>
                  <span>〉</span>
                </div>
                <div className="grid grid-cols-7 text-center text-[11px] text-[#8A7982] font-medium">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 text-center text-xs gap-y-2 pt-1">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <span key={i} className={`py-1 rounded-full ${i + 1 === 16 ? 'bg-[#634753] text-white font-bold' : 'text-[#3E3238]'}`}>
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>

              {/* 놓치지 말아야 할 일정 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#3E3238]">놓치지 말아야 할 일정</span>
                  <span className="text-[#8A7982]">2개</span>
                </div>
                <div className="bg-white border border-[#E5E0D8] rounded-2xl p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#634753] font-bold">브랜드 A · 진행 중</span>
                    <p className="text-xs font-bold text-[#3E3238]">시즌오프 세일</p>
                    <p className="text-[10px] text-[#8A7982]">11.16 - 11.22 · 온라인</p>
                  </div>
                  <span className="text-xs font-bold text-red-500">최대 30%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 장바구니 화면 ================= */}
        {currentView === 'cart' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-6">
            <div>
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentView('chat')} className="text-[#634753] text-sm font-medium">〈 홈으로</button>
                <span className="text-xs font-semibold text-[#8A7982]">장바구니</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: '아이보리 세츠', price: '39,000원', option: '아이보리 / M' },
                  { name: '네이비 가디건', price: '49,000원', option: '네이비 / M' },
                  { name: '블랙 슬랙스', price: '59,000원', option: '블랙 / M' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E5E0D8] rounded-2xl p-3 flex justify-between items-center shadow-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#3E3238]">{item.name}</p>
                      <p className="text-[10px] text-[#8A7982]">{item.option}</p>
                      <p className="text-xs font-bold text-[#634753]">{item.price}</p>
                    </div>
                    <span className="text-xs text-[#8A7982] cursor-pointer">✕</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => alert('결제 화면으로 이동합니다!')} className="w-full bg-[#634753] text-white text-xs py-3.5 rounded-xl font-medium shadow-md">
              147,000원 선택 상품 구매하기
            </button>
          </div>
        )}

        {/* ================= 마이페이지 화면 ================= */}
        {currentView === 'mypage' && (
          <div className="flex flex-col justify-between h-full flex-1 pb-6 overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => setCurrentView('chat')} className="text-[#634753] text-sm font-medium">〈 홈으로</button>
                <span className="text-xs font-semibold text-[#8A7982]">마이페이지</span>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 space-y-2 shadow-sm">
                <h3 className="text-sm font-bold text-[#3E3238]">내 프로필 정보</h3>
                <p className="text-xs text-[#7A6B73]">나이: {age}세 / 성별: {gender}</p>
                <p className="text-xs text-[#7A6B73]">키: {height}cm / 몸무게: {weight}kg</p>
                <p className="text-xs text-[#7A6B73]">퍼스널 컬러: {personalColor}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#3E3238]">📌 나의 스크랩 보관함 ({scraps.length})</h3>
                {scraps.length === 0 ? (
                  <p className="text-xs text-[#8A7982] py-8 text-center bg-white border border-[#E5E0D8] rounded-2xl">
                    아직 스크랩한 상담 답변이 없어요.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scraps.map((scrapText, idx) => (
                      <div key={idx} className="bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-[#3E3238] space-y-2 shadow-sm">
                        <p className="leading-relaxed whitespace-pre-wrap">{scrapText}</p>
                        <button onClick={() => toggleScrap(scrapText)} className="text-[10px] text-[#634753] font-bold underline">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  localStorage.removeItem('showMe_onboarding_done');
                  setCurrentView('landing');
                }}
                className="w-full bg-[#F3EFEA] text-[#634753] text-xs py-3 rounded-xl font-medium border border-[#E5E0D8]"
              >
                [테스트용] 온보딩 처음부터 다시 보기
              </button>
            </div>
          </div>
        )}

        {/* ================= 하단 네비게이션 바 ================= */}
        {['chat', 'wardrobe', 'avatar', 'taste', 'calendar'].includes(currentView) && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#FBF9F5] border-t border-[#EFECE6] px-6 py-2.5 flex justify-between items-center text-xs">
            {[
              { id: 'chat', label: '채팅', icon: '💬' },
              { id: 'wardrobe', label: '옷장', icon: '👔' },
              { id: 'avatar', label: '아바타', icon: '👤' },
              { id: 'taste', label: '취향 찾기', icon: '⭐' },
              { id: 'calendar', label: '캘린더', icon: '📅' },
            ].map((tab) => {
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={`flex flex-col items-center gap-1 transition ${
                    isActive ? 'text-[#634753] font-bold' : 'text-[#8A7982] hover:text-[#3E3238]'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}