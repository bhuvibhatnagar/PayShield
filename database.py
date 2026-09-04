# pyrefly: ignore [missing-import]
import mysql.connector


def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="BerryJam",
        database="ai_risk_manager"
    )

    return connection