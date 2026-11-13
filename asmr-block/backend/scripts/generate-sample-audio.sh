#!/bin/sh
# =====================================================
# 개발용 샘플 음원 생성기 (ffmpeg로 합성 - 저작권 걱정 없음)
#
# 사용법: ./generate-sample-audio.sh <출력폴더>
#   → <출력폴더>/samples/*.mp3 생성 (이미 있는 파일은 건너뜀)
#
# 실제 ASMR 녹음이 아니라 "소리 블록" 기능을 테스트하기 위한
# 합성 음원입니다. 진짜 음원이 생기면 교체하세요.
# 모든 파일은 같은 형식(44.1kHz 스테레오 128kbps)과
# 같은 음량(-24 LUFS)으로 맞춥니다. 블록끼리는 서버가 크로스페이드로
# 이어 붙이므로, 앞뒤 페이드는 잡음 방지용으로 0.5초만 넣습니다.
# =====================================================
set -eu

OUT_DIR="${1:?출력 폴더를 지정하세요. 예: ./generate-sample-audio.sh ./media}"
mkdir -p "$OUT_DIR/samples"

SR=44100
# 왼쪽/오른쪽 채널에 서로 다른 노이즈를 넣어 공간감을 줌
stereo_noise() { # $1=색(white|pink|brown) $2=세기
  echo "anoisesrc=c=$1:r=$SR:a=$2:seed=11[nl];anoisesrc=c=$1:r=$SR:a=$2:seed=29[nr];[nl][nr]amerge=inputs=2"
}

gen() { # $1=파일명 $2=길이(초) $3=필터그래프(마지막 출력은 라벨 없이)
  out="$OUT_DIR/samples/$1"
  if [ -s "$out" ]; then
    echo "  - $1 (이미 있음, 건너뜀)"
    return
  fi
  fade_out_start=$(awk "BEGIN { print $2 - 0.5 }")
  ffmpeg -nostdin -hide_banner -loglevel error -y \
    -filter_complex "$3,aformat=channel_layouts=stereo,afade=t=in:d=0.5,afade=t=out:st=${fade_out_start}:d=0.5,loudnorm=I=-24:TP=-2:LRA=11,aresample=$SR" \
    -t "$2" -ac 2 -c:a libmp3lame -b:a 128k "$out.tmp.mp3"
  mv "$out.tmp.mp3" "$out"
  echo "  + $1 (${2}초)"
}

echo "샘플 음원 생성 → $OUT_DIR/samples (처음 한 번만, 1~2분 걸릴 수 있어요)"

# --- 자연 ---
gen rain.mp3 180 "$(stereo_noise pink 0.5),highpass=f=400,lowpass=f=6500,volume='0.85+0.15*sin(2*PI*t/7)':eval=frame" &
gen waves.mp3 240 "$(stereo_noise brown 0.6),lowpass=f=1200,volume='0.2+0.8*pow(sin(PI*t/8),4)':eval=frame" &
gen wind.mp3 180 "$(stereo_noise brown 0.6),bandpass=f=500:width_type=h:w=700,volume='0.5+0.5*sin(2*PI*t/11)*sin(2*PI*t/5)':eval=frame" &

# --- 사물 ---
gen clock.mp3 180 "aevalsrc=exprs='0.6*sin(2*PI*if(lt(mod(t,2),1),3200,2500)*t)*exp(-mod(t,1)*400)':s=$SR,highpass=f=800" &
gen typing.mp3 240 "aevalsrc=exprs='(random(0)*2-1)*(exp(-mod(t,0.19)*300)+0.7*exp(-mod(t+0.07,0.27)*300))*gt(sin(2*PI*t/9),-0.6)*0.5':s=$SR,bandpass=f=2500:width_type=h:w=3000" &
gen singing_bowl.mp3 240 "aevalsrc=exprs='0.3*(sin(2*PI*220*t)+0.5*sin(2*PI*606*t)+0.25*sin(2*PI*1183*t))*exp(-mod(t,10)*0.45)*(1-exp(-mod(t,10)*200))':s=$SR,aecho=0.8:0.7:60|120:0.3|0.2" &

# --- 신체 ---
gen heartbeat.mp3 180 "aevalsrc=exprs='0.9*sin(2*PI*55*t)*exp(-mod(t,1)*28)+0.6*sin(2*PI*48*t)*exp(-mod(t-0.28,1)*30)+0.2*sin(2*PI*110*t)*exp(-mod(t,1)*40)':s=$SR,lowpass=f=300" &
gen breathing.mp3 180 "$(stereo_noise pink 0.5),highpass=f=200,lowpass=f=1800,volume='0.05+0.9*pow(sin(PI*t/5),2)':eval=frame" &

# --- 음식 ---
gen sizzle.mp3 180 "$(stereo_noise white 0.4),highpass=f=2500,volume='0.6+0.4*sin(2*PI*13*t)*sin(2*PI*3.7*t)':eval=frame" &

# --- 환경 ---
gen fan.mp3 240 "$(stereo_noise brown 0.6),lowpass=f=900[fn];sine=frequency=120:sample_rate=$SR,volume=0.03,aformat=channel_layouts=stereo[fh];[fn][fh]amix=inputs=2:normalize=0" &
gen pink_noise.mp3 180 "$(stereo_noise pink 0.5)" &
gen brown_noise.mp3 180 "$(stereo_noise brown 0.6)" &

# --- 트렌드 / 세계의 소리 ---
# 왁스 부수기: 듬성듬성 터지는 바삭한 크랙 (4초 주기로 세게/약하게)
gen wax_crack.mp3 180 "aevalsrc=exprs='(random(0)*2-1)*gt(random(1),0.9975)*(0.35+0.65*gt(sin(2*PI*t/4),-0.3))':s=$SR,highpass=f=1200,bandpass=f=3500:width_type=h:w=4000,aecho=0.6:0.3:12:0.25" &
# 일본 신호등 뻐꾸기: 높은음-낮은음 "뻐꾹" 1.6초 주기 + 낮은 거리 소음
gen japan_crossing.mp3 180 "aevalsrc=exprs='0.35*(sin(2*PI*1040*t)*between(mod(t,1.6),0,0.22)*sin(PI*min(mod(t,1.6),0.22)/0.22)+sin(2*PI*830*t)*between(mod(t,1.6),0.3,0.62)*sin(PI*min(max(mod(t,1.6)-0.3,0),0.32)/0.32))':s=$SR,aecho=0.7:0.4:80:0.2[cj];$(stereo_noise brown 0.25),lowpass=f=700[cn];[cj]aformat=channel_layouts=stereo[cjs];[cjs][cn]amix=inputs=2:normalize=0" &
# 비누 깎기: 1.3초마다 사각- 하고 긁는 소리
gen soap_cutting.mp3 180 "$(stereo_noise white 0.5),bandpass=f=2800:width_type=h:w=2500,volume='pow(sin(PI*min(mod(t,1.3),0.7)/0.7),2)*lt(mod(t,1.3),0.7)':eval=frame" &

wait

# 15개가 모두 만들어졌는지 확인
count=$(find "$OUT_DIR/samples" -name '*.mp3' ! -name '*.tmp.mp3' | wc -l)
if [ "$count" -lt 15 ]; then
  echo "샘플 음원 생성 실패: $count/15 개만 만들어졌습니다." >&2
  exit 1
fi
echo "완료! ($count개)"
