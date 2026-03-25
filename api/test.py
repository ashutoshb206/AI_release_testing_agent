# Minimal test function to debug serverless issues
def handler(request):
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        },
        "body": '{"status": "ok", "message": "Serverless function is working"}'
    }
