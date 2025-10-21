from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime

app = Flask(__name__)

# CORS 설정
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# 정적 파일 서빙
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# data.json 저장 API
@app.route('/api/save-data', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
        
        # data.json 파일에 저장
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': '데이터가 성공적으로 저장되었습니다.',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'파일 저장 중 오류가 발생했습니다: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("마비노기 모바일 레시피 도우미 백엔드 서버 시작...")
    print("서버 주소: http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=False)
