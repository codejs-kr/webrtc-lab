# WebRTC 연구실 - 1:1 화상회의 만들기

### 시그널링 시나리오

	1. offer가 SDP와 candidate전송
	2. answer는 offer가 보낸 SDP와 cadidate를 Set한다.
	3. answer는 응답할 SDP와 candidate를 얻어서 offer한테 전달한다.
	4. offer는 응답 받은 SDP와 candidate를 Set한다.
	
### Demo
https://webrtclab.herokuapp.com/conference
