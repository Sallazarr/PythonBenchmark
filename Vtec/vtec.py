import requests 
import subprocess
import os
import time

# 1. Escolha do tipo de instalador
print("Qual versão você deseja baixar?")
print("1 - Payer (oficial)")
print("2 - Associadas (whitelabel)")

opcao = input("Digite 1 ou 2: ").strip()

if opcao == "1":
    url_base = "https://checkout-apps2.s3.amazonaws.com/"
    prefixo_arquivo = "setup_payer_checkout_v"
elif opcao == "2":
    url_base = "https://associadas.s3.amazonaws.com/"
    prefixo_arquivo = "setup_associadas_checkout_v"
else:
    print("❌ Opção inválida. Encerrando o programa.")
    exit()

# 2. Receber a versão do usuário
versao = input("Digite a versão do instalador (ex: 1.27.21-beta): ").strip()

# 3. Montar o nome do arquivo e a URL
nome_arquivo = f"{prefixo_arquivo}{versao}.exe"
url_completa = url_base + nome_arquivo

# 4. Obter caminho da pasta Downloads do usuário
pasta_downloads = os.path.join(os.path.expanduser("~"), "Downloads")

# 5. Local onde será salvo
caminho_arquivo = os.path.join(pasta_downloads, nome_arquivo)

print(f"\nBaixando: {nome_arquivo}")
print(f"De: {url_completa}")
print(f"Para: {caminho_arquivo}\n")

try:
    inicio = time.time()

    resposta = requests.get(url_completa, stream=True, timeout=30)
    if resposta.status_code == 200:
        with open(caminho_arquivo, 'wb') as f:
            for chunk in resposta.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        fim = time.time()
        print(f"✅ Download concluído em {fim - inicio:.2f} segundos!")

        # Executar o instalador
        print("⏳ Iniciando o instalador...")
        subprocess.run([caminho_arquivo], shell=True)
    else:
        print(f"❌ Erro ao baixar. Código HTTP: {resposta.status_code}")
except Exception as e:
    print(f"❌ Ocorreu um erro: {e}")