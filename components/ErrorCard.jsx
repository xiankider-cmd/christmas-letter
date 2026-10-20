// 😢 문제가 생겼을 때 보여주는 카드
export default function ErrorCard({ title = '앗, 잠깐만요!', message }) {
  return (
    <main className="page">
      <div className="page-bg" />
      <div className="wrap" style={{ marginTop: '18vh' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="ribbon">🎄</span>
          <h2>{title}</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, wordBreak: 'keep-all' }}>{message}</p>
          <a className="btn btn-red" href="/">처음 화면으로</a>
        </div>
      </div>
    </main>
  );
}
