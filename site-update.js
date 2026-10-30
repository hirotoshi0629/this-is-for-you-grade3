(() => {
  const openView = window.openView;
  window.openView = function (id) {
    const result = openView.apply(this, arguments);
    if (id === 'maker') {
      const shapes = document.getElementById('makerShapes');
      if (shapes && !shapes.childElementCount) window.initMaker();
      window.renderSavedCards?.();
    }
    return result;
  };

  const art = [
    ['home-dictionary-watercolor.png', '形の絵が開いた絵本とカード'],
    ['home-karuta-watercolor.png', '形カードを聞き分ける子ども'],
    ['home-memory-watercolor.png', '形カードの神経衰弱'],
    ['home-shop-watercolor.png', '形カードを売り買いするお店'],
    ['home-maker-watercolor.png', '形のカードを作る子ども'],
    ['home-gift-watercolor.png', '手作りカードを贈る子どもたち'],
    ['home-forest-watercolor.png', '形の森を冒険する子ども']
  ];
  document.querySelectorAll('#home .module-grid .module').forEach((card, index) => {
    const slot = card.querySelector('.module-ill');
    const [src, alt] = art[index] || [];
    if (!slot || !src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    slot.replaceChildren(img);
  });

  const style = document.createElement('style');
  style.textContent = `
    #home .module { min-height: 218px; }
    #home .module-ill { height: 112px; width: 100%; overflow: hidden; }
    #home .module-ill img { display: block; width: 100%; height: 112px; object-fit: contain; }
    @media (max-width:700px) {
      #home .module { min-height: 200px; }
      #home .module-ill, #home .module-ill img { height: 94px; }
    }
  `;
  document.head.append(style);

  const speechSection = document.getElementById('forestSpeechChallenge');
  speechSection?.querySelector('button[onclick="completeForestSpeechStep()"]')?.remove();
  const privacy = speechSection?.querySelector('.privacy-note');
  if (privacy) privacy.textContent = 'マイクで英語を話すと、ブラウザの音声認識で確認します。音声認識に対応したブラウザとマイクの許可が必要です。認識できない場合は次へ進まず、設定を確認してもう一度試します。音声の処理はブラウザ提供元の方針に従います。';

  const originalRender = window.renderForestSpeechStep;
  const originalComplete = window.completeForestSpeechStep;
  window.forestSpeechVerified = false;
  if (originalRender) window.renderForestSpeechStep = function () {
    window.forestSpeechVerified = false;
    return originalRender.apply(this, arguments);
  };
  if (originalComplete) window.completeForestSpeechStep = function () {
    if (!window.forestSpeechVerified) {
      const status = document.getElementById('forestSpeechStatus');
      if (status) status.textContent = 'マイクで声を聞き取ってから進めます。🎙️ マイクボタンを押して話してね。';
      return;
    }
    window.forestSpeechVerified = false;
    return originalComplete.apply(this, arguments);
  };

  window.recognizeForestSpeech = async function () {
    const status = document.getElementById('forestSpeechStatus');
    if (!status) return;
    if (window.forestRecognitionBusy) {
      status.textContent = '聞き取り中だよ。マイクに向かって英語を話してね。';
      return;
    }
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      status.textContent = 'このブラウザはマイクでの英語認識に対応していません。音声認識に対応したChromeまたはEdgeで開いてね。';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'この画面ではマイクを使えません。HTTPSのアプリURLを開いてね。';
      return;
    }
    let permissionStream;
    try {
      status.textContent = 'マイクの確認が出たら「許可」を選んで、英語を話してね。';
      permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      status.textContent = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        ? 'マイクがブロックされています。アドレスバーのサイト設定からマイクを許可して、もう一度押してね。'
        : error?.name === 'NotFoundError'
          ? 'マイクが見つからないよ。端末のマイク設定を確認してね。'
          : 'マイクを開始できませんでした。ブラウザのマイク設定を確認してね。';
      return;
    }
    const recognition = new API();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 4;
    recognition.onstart = () => {
      window.forestRecognitionBusy = true;
      status.textContent = '聞き取り中… マイクに向かって英語を話してね。';
    };
    recognition.onresult = event => {
      const heard = [...event.results[0]].map(result => result.transcript);
      status.textContent = `聞こえた英語：${heard[0] || '（聞き取れませんでした）'}`;
      if (heard.some(window.forestSpeechMatches)) {
        window.forestSpeechVerified = true;
        status.textContent = '正しく言えたよ！次へ進もう。';
        window.completeForestSpeechStep();
      } else {
        status.textContent = 'おしい！お手本をもう一度聞いて、ゆっくり言ってみよう。';
      }
    };
    recognition.onerror = event => {
      window.forestRecognitionBusy = false;
      status.textContent = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'マイクがブロックされています。アドレスバーのサイト設定からマイクを許可してね。'
        : event.error === 'no-speech'
          ? '声が聞こえなかったよ。マイクに近づいて、もう一度話してみよう。'
          : '音声を聞き取れなかったよ。マイクを確認してもう一度試してね。';
    };
    recognition.onend = () => { window.forestRecognitionBusy = false; };
    try {
      recognition.start();
    } catch {
      window.forestRecognitionBusy = false;
      status.textContent = 'マイクを開始できませんでした。マイクの許可を確認して、もう一度押してね。';
    }
  };
})();
