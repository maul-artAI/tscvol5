<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Berita Acara Pertandingan</title>
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 10.5px; color: #111; margin: 0 8px; }
  .kop { border-bottom: 3px double #111; padding-bottom: 6px; margin-bottom: 8px; }
  .kop-table { border: none; table-layout: fixed; width: 100%; }
  .kop-table td { border: none; vertical-align: middle; }
  .kop-logo { width: 130px; text-align: center; }
  .kop img.tsc { height: 68px; }
  .kop img.stelk { width: 120px; }
  .kop-text { text-align: center; }
  .kop h1 { font-size: 14px; margin: 4px 0 1px; text-transform: uppercase; white-space: nowrap; }
  .kop h2 { font-size: 12px; margin: 0; text-transform: uppercase; white-space: nowrap; }
  .kop p { font-size: 9px; margin: 1px 0 0; color: #444; }
  h3.section { font-size: 11px; background: #eee; padding: 4px 8px; margin: 8px 0 4px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #555; padding: 4px 6px; text-align: left; }
  th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; }
  thead { display: table-header-group; }
  table.summary { table-layout: fixed; }
  table.summary th:first-child, table.summary td:first-child { width: 46%; }
  table.summary th, table.summary td { word-wrap: break-word; }
  .sig-block { page-break-inside: avoid; }
  .center { text-align: center; }
  .score { font-size: 22px; font-weight: bold; text-align: center; padding: 4px; }
  .team { font-size: 12px; font-weight: bold; text-align: center; width: 38%; }
  .sig { margin-top: 10px; }
  .sig td { border: none; text-align: center; vertical-align: top; padding-top: 4px; }
  .sig .space { height: 52px; }
  .foot { margin-top: 8px; font-size: 9px; color: #666; text-align: right; }
</style>
</head>
<body>

<div class="kop">
  <table class="kop-table">
    <tr>
      <td class="kop-logo">
        @if(file_exists($stelkPath))
          <img class="stelk" src="{{ $stelkPath }}" alt="Logo SMK Telkom Makassar">
        @endif
      </td>
      <td class="kop-text">
        <h1>Berita Acara Pertandingan</h1>
        <h2>Telkom School Cup Vol V</h2>
        <p>Play, Respect, Grow Together</p>
      </td>
      <td class="kop-logo">
        @if(file_exists($logoPath))
          <img class="tsc" src="{{ $logoPath }}" alt="Logo TSC">
        @endif
      </td>
    </tr>
  </table>
</div>

<h3 class="section">A. Informasi Pertandingan</h3>
<table>
  <tr>
    <td class="team">{{ $match->team1->name ?? 'TBD' }}</td>
    <td class="score">{{ $match->team1_score }} - {{ $match->team2_score }}</td>
    <td class="team">{{ $match->team2->name ?? 'TBD' }}</td>
  </tr>
  @if($match->is_penalty || (!is_null($match->penalty1) && !is_null($match->penalty2)))
  <tr>
    <td class="center" style="font-size:12px">Adu Penalti</td>
    <td class="score" style="font-size:16px">({{ $match->penalty1 ?? '-' }} - {{ $match->penalty2 ?? '-' }})</td>
    <td class="center" style="font-size:12px">PEN</td>
  </tr>
  @endif
</table>
<br>
<table>
  <tr><th style="width:30%">Tanggal</th><td>{{ $tanggal }}</td></tr>
  <tr><th>Kickoff</th><td>{{ $match->kickoff ? substr($match->kickoff, 0, 5) : '-' }} WITA</td></tr>
  <tr><th>Venue / Lapangan</th><td>{{ $match->venue ?? 'SMK Telkom Makassar' }} / {{ $match->lapangan ?? '-' }}</td></tr>
  <tr><th>Kategori / Babak</th><td>{{ $match->category }} / {{ $match->stage ?? '-' }} {{ $match->round_label ? '('.$match->round_label.' '.($match->slot ?? '').')' : '' }}</td></tr>
  <tr><th>Status</th><td>{{ $statusLabel }}</td></tr>
</table>

<h3 class="section">B. Ringkasan Kejadian</h3>
<table class="summary">
  <tr><th class="center">Kejadian</th><th class="center">{{ $match->team1->short_name ?? $match->team1->name ?? '' }}</th><th class="center">{{ $match->team2->short_name ?? $match->team2->name ?? '' }}</th></tr>
  <tr><td>Gol</td><td class="center">{{ $summary['team1']['goal'] }}</td><td class="center">{{ $summary['team2']['goal'] }}</td></tr>
  <tr><td>Kartu Kuning</td><td class="center">{{ $summary['team1']['yellow_card'] }}</td><td class="center">{{ $summary['team2']['yellow_card'] }}</td></tr>
  <tr><td>Kartu Merah</td><td class="center">{{ $summary['team1']['red_card'] }}</td><td class="center">{{ $summary['team2']['red_card'] }}</td></tr>
</table>

<h3 class="section">C. Kronologi Kejadian</h3>
<table>
  <tr><th class="center" style="width:8%">No</th><th class="center" style="width:10%">Menit</th><th style="width:22%">Tim</th><th style="width:18%">Kejadian</th><th>Pemain</th><th>Assist / Ket.</th></tr>
  @forelse($events as $i => $e)
    <tr>
      <td class="center">{{ $i + 1 }}</td>
      <td class="center">{{ $e->minute }}&prime;</td>
      <td>{{ $e->team_side === 'team1' ? ($match->team1->name ?? '') : ($match->team2->name ?? '') }}</td>
      <td>{{ $typeLabels[$e->type] ?? $e->type }}</td>
      <td>{{ $e->player_name }}</td>
      <td>{{ $e->assist_name ?? '-' }}</td>
    </tr>
  @empty
    <tr><td colspan="6" class="center">Tidak ada kejadian tercatat.</td></tr>
  @endforelse
</table>

<div class="sig-block">
<h3 class="section">D. Pengesahan</h3>
<p>Demikian berita acara ini dibuat dengan sebenarnya dan ditandatangani oleh kedua kapten tim.</p>
<table class="sig">
  <tr>
    <td>Kapten {{ $match->team1->short_name ?? $match->team1->name ?? '' }},<br><br><div class="space"></div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</td>
    <td>Kapten {{ $match->team2->short_name ?? $match->team2->name ?? '' }},<br><br><div class="space"></div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</td>
  </tr>
  <tr>
    <td>Wasit,<br><br><div class="space"></div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</td>
    <td>Panitia Pelaksana,<br><br><div class="space"></div>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</td>
  </tr>
</table>
</div>

<p class="foot">Dicetak {{ $printedAt }} dari TSC Admin</p>

</body>
</html>
