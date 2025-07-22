import psutil
import platform
from datetime import datetime
import wmi  # Biblioteca para acessar WMI no Windows (informações do sistema)
import time
import tempfile
import os
import concurrent.futures  # Para execução multithread (paralela)
from collections import Counter  # Para contar itens em listas
import numpy as np  # Biblioteca para operações numéricas, aqui usada para testar alocação de RAM
import json
import sys



# Função que converte bytes para gigabytes com 2 casas decimais
def bytes_to_gb(bytes_value):
    return round(bytes_value / (1024 ** 3), 2)

# Função para obter informações da CPU usando WMI
def get_cpu_info(w):
    # Loop nos processadores encontrados (normalmente um só)
    for cpu in w.Win32_Processor():
        name = cpu.Name.strip()  # Nome da CPU
        cores = cpu.NumberOfCores  # Número de núcleos físicos
        threads = cpu.NumberOfLogicalProcessors  # Número de threads lógicas
        freq = cpu.MaxClockSpeed  # Frequência máxima em MHz
        return {
            "name": name,
            "cores": cores,
            "threads": threads,
            "freq": freq
        }
    # Caso WMI falhe, fallback usando psutil e platform
    return {
        "name": platform.processor(),
        "cores": psutil.cpu_count(logical=False),
        "threads": psutil.cpu_count(logical=True),
        "freq": round(psutil.cpu_freq().max if psutil.cpu_freq() else 0, 2)
    }

# Função para obter informações da placa mãe (fabricante e modelo)
def get_motherboard_info(w):
    try:
        baseboard = w.Win32_BaseBoard()[0]  # Pega a primeira baseboard encontrada
        manufacturer = baseboard.Manufacturer.strip()  # Fabricante da placa mãe
        product = baseboard.Product.strip()  # Modelo da placa mãe
        return manufacturer, product
    except Exception:
        # Se falhar, retorna desconhecido
        return "Desconhecido", "Desconhecido"

# Função para obter informações da memória RAM
def get_ram_info():
    mem = psutil.virtual_memory()  # Obtem estatísticas da RAM atual
    return {
        "total": bytes_to_gb(mem.total),  # Total de RAM em GB
        "used": bytes_to_gb(mem.used),  # RAM usada em GB
        "available": bytes_to_gb(mem.available),  # RAM disponível em GB
        "percent": mem.percent  # Percentual de RAM usada
    }

# Função que lista as partições de disco e suas informações
def get_disks_info():
    disks = []
    partitions = psutil.disk_partitions(all=False)  # Lista partições acessíveis
    for p in partitions:
        try:
            usage = psutil.disk_usage(p.mountpoint)  # Espaço usado da partição
            disks.append({
                "device": p.device,  # Nome do dispositivo
                "mountpoint": p.mountpoint,  # Ponto de montagem (ex: C:\)
                "fstype": p.fstype,  # Tipo do sistema de arquivos
                "total": bytes_to_gb(usage.total),  # Tamanho total em GB
                "free": bytes_to_gb(usage.free),  # Espaço livre em GB
                "used_percent": usage.percent  # Percentual usado
            })
        except PermissionError:
            # Ignora partições que não podem ser acessadas (permissão negada)
            continue
    return disks

# Função que obtém informações básicas do sistema operacional
def get_os_info():
    return {
        "system": platform.system(),  # Ex: Windows
        "version": platform.version(),  # Versão do SO
        "release": platform.release(),  # Release do SO
        "architecture": platform.architecture()[0]  # 32 ou 64 bits
    }

# Função para obter o uptime (tempo ligado) do sistema via WMI
def get_uptime(w):
    os_obj = w.Win32_OperatingSystem()[0]  # Objeto do SO via WMI
    # Converte string do último boot para datetime
    last_boot = datetime.strptime(os_obj.LastBootUpTime.split('.')[0], '%Y%m%d%H%M%S')
    uptime = datetime.now() - last_boot  # Diferença entre agora e boot
    return str(uptime).split('.')[0]  # Retorna formato hh:mm:ss

# Função para obter a data da BIOS via WMI
def get_bios_date(w):
    bios = w.Win32_BIOS()[0]  # Objeto BIOS via WMI
    bios_date_str = bios.ReleaseDate.split('.')[0]  # Data em string
    bios_date = datetime.strptime(bios_date_str, '%Y%m%d%H%M%S').date()  # Converte para date
    return bios_date.isoformat()  # Retorna string no formato ISO (YYYY-MM-DD)

# Função para obter nome e versão do Windows via WMI
def get_windows_version_and_edition(w):
    os_obj = w.Win32_OperatingSystem()[0]
    caption = os_obj.Caption  # Nome do Windows (ex: Microsoft Windows 10 Pro)
    version = os_obj.Version  # Versão (ex: 10.0.19043)
    return caption, version

# Função para obter o tipo de máquina (Desktop, Notebook, Outro) via WMI
def get_machine_type(w):
    chassis = w.Win32_SystemEnclosure()[0]
    types = chassis.ChassisTypes  # Lista de códigos do tipo de gabinete
    if 8 in types:
        return "Notebook"
    elif 3 in types:
        return "Desktop"
    else:
        return "Outro"

# Função que retorna lista de controladores USB conectados (nomes)
def get_usb_ports(w):
    ports = []
    for controller in w.Win32_USBController():
        try:
            ports.append(controller.Name)
        except:
            continue
    return ports

# Função que retorna lista de dispositivos USB conectados (nomes)
def get_usb_devices(w):
    devices = []

    # Dispositivos PnP com ID USB
    for device in w.Win32_PnPEntity():
        try:
            if device.PNPDeviceID and device.PNPDeviceID.startswith("USB\\"):
                devices.append(device.Name)
        except:
            continue

    # Dispositivos de armazenamento conectados por USB
    for disk in w.Win32_DiskDrive():
        try:
            if disk.InterfaceType == "USB":
                devices.append(f"{disk.Model} (Armazenamento USB)")
        except:
            continue

    # Eliminar duplicatas
    devices = list(set(devices))
    return devices

# Função que simula trabalho pesado somando quadrados de números em um intervalo
def trabalho_pesado(start, end):
    total = 0
    for i in range(start, end):
        total += i * i
    return total

# Função que faz o teste de CPU dividindo o trabalho em múltiplas threads
def teste_cpu():
    num_threads = psutil.cpu_count(logical=True)  # Quantidade de threads lógicas
    intervalo = 15_000_000 // num_threads  # Divide trabalho em partes iguais
    ranges = [(i*intervalo, (i+1)*intervalo) for i in range(num_threads)]

    start = time.time()
    # Usa ThreadPoolExecutor para executar trabalho_pesado em paralelo
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        resultados = list(executor.map(lambda args: trabalho_pesado(*args), ranges))
    end = time.time()

    total_final = sum(resultados)  # Soma resultados (não usada mas calculada)
    return round(end - start, 3)  # Retorna tempo total em segundos arredondado

# Função para calcular fatorial de um número (usado para teste CPU)
def fatorial(n):
    resultado = 1
    for i in range(2, n+1):
        resultado *= i
    return resultado

# Função que calcula fatorial em um intervalo e soma os resultados (para carga)
def trabalho_fatorial(start, end):
    total = 0
    # Faz fatorial de números limitados a 20 para evitar estouro de memória/tempo
    for i in range(start, end):
        total += fatorial(i % 200 + 1)
    return total

# Teste de CPU baseado em cálculo de fatoriais em múltiplas threads
def teste_cpu_fatorial():
    num_threads = psutil.cpu_count(logical=True)
    intervalo = 10000 // num_threads  # Menor intervalo por ser mais pesado
    ranges = [(i*intervalo, (i+1)*intervalo) for i in range(num_threads)]

    start = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        resultados = list(executor.map(lambda args: trabalho_fatorial(*args), ranges))
    end = time.time()

    total_final = sum(resultados)
    return round(end - start, 3)

# Função para testar desempenho de escrita e leitura em um disco específico
def teste_disco_em_path(mountpoint):
    try:
        # Cria pasta temporária para teste
        temp_dir = os.path.join(mountpoint, "TempBenchmark")
        os.makedirs(temp_dir, exist_ok=True)

        temp_path = os.path.join(temp_dir, "benchmark_test_file.tmp")
        data = os.urandom(200 * 1024 * 1024)  # Gera 200 MB de dados aleatórios

        # Testa tempo de escrita
        start_write = time.time()
        with open(temp_path, 'wb') as f:
            f.write(data)
        end_write = time.time()

        # Testa tempo de leitura
        start_read = time.time()
        with open(temp_path, 'rb') as f:
            f.read()
        end_read = time.time()

        # Remove arquivo e pasta temporária
        os.remove(temp_path)
        os.rmdir(temp_dir)

        # Calcula tempos arredondados
        tempo_write = round(end_write - start_write, 3)
        tempo_read = round(end_read - start_read, 3)

        return tempo_write, tempo_read
    except Exception:
        # Se erro, retorna -1 para indicar falha no teste
        return -1, -1

# Função para rodar testes de disco em todas as partições detectadas
def teste_todos_discos(disks):
    resultados = {}
    for disk in disks:
        write_time, read_time = teste_disco_em_path(disk["mountpoint"])
        resultados[disk["device"]] = {"write": write_time, "read": read_time}
    return resultados

# Teste para alocação de RAM criando um grande array e realizando operação simples
def teste_ram_alocacao():
    try:
        start = time.time()
        a = np.zeros((100_000_000,), dtype=np.float64)  # ~800 MB de RAM alocada
        a += 1.0  # Operação para forçar uso da memória
        end = time.time()
        tempo = round(end - start, 3)
        return tempo
    except MemoryError:
        # Caso falhe por falta de memória, retorna infinito para indicar problema
        return float('inf')

# Função que calcula pontuações baseadas nos tempos e capacidades dos testes
def calcular_pontuacoes(cpu, ram, disks, tempo_cpu, tempo_cpu_fatorial, tempos_discos, tempo_ram=None):
    tempo_cpu_ref = 1.0
    tempo_cpu_fat_ref = 0.05
    tempo_disco_ref = 1.0
    tempo_ram_ref = 0.5

    score_cpu_soma = max(0, 10 * (tempo_cpu_ref / tempo_cpu)**0.5)
    score_cpu_fat = max(0, 10 * (tempo_cpu_fat_ref / tempo_cpu_fatorial)**0.5)
    # Limitando CPU a no máximo 10
    score_cpu = round(min(10, score_cpu_soma * 0.7 + score_cpu_fat * 0.3), 2)

    score_ram_cap = min(10, (ram["total"] / 8) * 10)
    score_ram_vel = 10 if tempo_ram is None else min(10, max(0, 10 * (tempo_ram_ref / tempo_ram)**0.5))
    score_ram = round(min(10, (score_ram_cap * 0.5 + score_ram_vel * 0.5)), 2)

    scores_discos = []
    for times in tempos_discos.values():
        if times["write"] == -1 or times["read"] == -1:
            score = 0
        else:
            tempo_total = times["write"] + times["read"]
            score = max(0, 10 * (tempo_disco_ref / tempo_total)**0.5)
            score = min(10, score)  # Limitar disco a no máximo 10
        scores_discos.append(score)
    score_disco = round(sum(scores_discos) / len(scores_discos), 2) if scores_discos else 0

    media = round(score_cpu * 0.6 + score_ram * 0.35 + score_disco * 0.05, 2)

    return score_cpu, score_ram, score_disco, media

# Função que verifica se os requisitos mínimos são atendidos
def verificar_requisitos(cpu, ram, disks, os_info):
    erros = []

    if cpu["freq"] < 1800 or cpu["cores"] < 2:
        erros.append(f"CPU abaixo do mínimo: {cpu['freq']} MHz e {cpu['cores']} núcleos (mínimo 1900 MHz e 2 núcleos)")

    if ram["total"] < 4:
        erros.append(f"RAM insuficiente: {ram['total']} GB (mínimo 4 GB)")

    for disk in disks:
        if disk["free"] < 1:
            erros.append(f"Pouco espaço livre em disco {disk['device']} ({disk['mountpoint']}): {disk['free']} GB (mínimo 1 GB)")

    return erros

# Função que verifica requisitos mais avançados
def verificar_requisitos_avancados(machine_type):
    erros = []
    if machine_type != "Desktop":
        erros.append(f"Recomendado usar máquina Desktop, detectado: {machine_type}")
    return erros



def obter_caminho_pasta_relatorios():
    caminho_base = os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "salazarbenchmarkelectron"
    )
    caminho_relatorios = os.path.join(caminho_base, "relatorios")

    if os.path.exists(caminho_base):
        if not os.path.exists(caminho_relatorios):
            os.makedirs(caminho_relatorios)
        return caminho_relatorios
    else:
        caminho_local = os.path.join(os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__)), "relatorios")
        if not os.path.exists(caminho_local):
            os.makedirs(caminho_local)
        return caminho_local

def gerar_relatorio(cpu, ram, discos, os_info, placa_mae, uptime, portas_usb, dispositivos_usb,
                    tempo_cpu=None, tempo_cpu_fatorial=None, tempos_discos=None, tempo_ram=None,
                    scores=None, erros=None, bios_date=None, win_edition=None, win_version=None, machine_type=None):

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    nome_arquivo_txt = f"relatorio_benchmark_{timestamp}.txt"
    nome_arquivo_json= f"relatorio_benchmark_{timestamp}.json"
    relatorio_txt = ""

    # Sistema Operacional
    relatorio_txt += "[Sistema Operacional]\n"
    relatorio_txt += f"Sistema: {os_info['system']}\n"
    relatorio_txt += f"Versão: {os_info['version']}\n"
    relatorio_txt += f"Release: {os_info['release']}\n"
    relatorio_txt += f"Arquitetura: {os_info['architecture']}\n"
    relatorio_txt += f"Uptime: {uptime}\n"
    relatorio_txt += f"Data BIOS: {bios_date}\n"
    relatorio_txt += f"Windows: {win_edition} - Versão {win_version}\n"
    relatorio_txt += f"Tipo de Máquina: {machine_type}\n"
    relatorio_txt += "="*40 + "\n\n"

    # CPU
    relatorio_txt += "[CPU]\n"
    relatorio_txt += f"Nome: {cpu['name']}\n"
    relatorio_txt += f"Núcleos Físicos: {cpu['cores']}\n"
    relatorio_txt += f"Núcleos Lógicos: {cpu['threads']}\n"
    relatorio_txt += f"Frequência Máxima: {cpu['freq']} MHz\n"
    relatorio_txt += f"Tempo teste soma quadrados: {tempo_cpu}s\n"
    relatorio_txt += f"Tempo teste fatorial: {tempo_cpu_fatorial}s\n"
    relatorio_txt += "="*40 + "\n\n"

    # RAM
    relatorio_txt += "[Memória RAM]\n"
    relatorio_txt += f"Total: {ram['total']} GB\n"
    relatorio_txt += f"Usada: {ram['used']} GB\n"
    relatorio_txt += f"Disponível: {ram['available']} GB\n"
    relatorio_txt += f"Uso: {ram['percent']}%\n"
    relatorio_txt += f"Tempo alocação RAM: {tempo_ram}s\n"
    relatorio_txt += "="*40 + "\n\n"

    # Discos
    relatorio_txt += "[Discos]\n"
    for disco in discos:
        relatorio_txt += f"Disco: {disco['device']} ({disco['mountpoint']})\n"
        relatorio_txt += f"  Total: {disco['total']} GB\n"
        relatorio_txt += f"  Livre: {disco['free']} GB\n"
        relatorio_txt += f"  Usado (%): {disco['used_percent']}%\n"
        if tempos_discos and disco['device'] in tempos_discos:
            relatorio_txt += f"  Tempo escrita: {tempos_discos[disco['device']]['write']}s\n"
            relatorio_txt += f"  Tempo leitura: {tempos_discos[disco['device']]['read']}s\n"
        relatorio_txt += "\n"
    relatorio_txt += "="*40 + "\n\n"

    # Placa Mãe
    relatorio_txt += "[Placa Mãe]\n"
    relatorio_txt += f"Fabricante: {placa_mae['Fabricante']}\n"
    relatorio_txt += f"Modelo: {placa_mae['Modelo']}\n"
    relatorio_txt += "="*40 + "\n\n"

    # Portas USB
    relatorio_txt += "[Portas USB]\n"
    for porta in portas_usb:
        relatorio_txt += f"- {porta}\n"
    relatorio_txt += "="*40 + "\n\n"

    # Dispositivos USB
    relatorio_txt += "[Dispositivos USB Detectados]\n"
    for device in dispositivos_usb:
        relatorio_txt += f"- {device}\n"
    relatorio_txt += "="*40 + "\n\n"

    # Erros
    if erros:
        relatorio_txt += "[Erros e Avisos]\n"
        for erro in erros:
            relatorio_txt += f"- {erro}\n"
        relatorio_txt += "="*40 + "\n\n"

    # Pontuações
    if scores:
        relatorio_txt += "[Pontuações]\n"
        relatorio_txt += f"CPU: {scores[0]}/10\n"
        relatorio_txt += f"RAM: {scores[1]}/10\n"
        relatorio_txt += f"Disco: {scores[2]}/10\n"
        relatorio_txt += f"Pontuação Final: {scores[3]}/10\n"
        relatorio_txt += "="*40 + "\n\n"

    # JSON
    relatorio_json = {
        "Sistema Operacional": {
            "Sistema": os_info['system'],
            "Versão": os_info['version'],
            "Release": os_info['release'],
            "Arquitetura": os_info['architecture'],
            "Uptime": uptime,
            "Data BIOS": bios_date,
            "Windows": win_edition,
            "Versão Windows": win_version,
            "Tipo de Máquina": machine_type
        },
        "CPU": {
            **cpu,
            "Tempo teste soma quadrados": tempo_cpu,
            "Tempo teste fatorial": tempo_cpu_fatorial
        },
        "RAM": {
            **ram,
            "Tempo alocação RAM": tempo_ram
        },
        "Discos": discos,
        "Tempos Discos": tempos_discos,
        "Placa Mãe": placa_mae,
        "Portas USB": portas_usb,
        "Dispositivos USB": dispositivos_usb,
        "Erros": erros,
        "Pontuações": {
            "CPU": scores[0] if scores else None,
            "RAM": scores[1] if scores else None,
            "Disco": scores[2] if scores else None,
            "Final": scores[3] if scores else None,
        }
    }

    pasta_relatorios = obter_caminho_pasta_relatorios()

    caminho_txt = os.path.join(pasta_relatorios, nome_arquivo_txt)
    caminho_json = os.path.join(pasta_relatorios, nome_arquivo_json)

    with open(caminho_txt, "w", encoding="utf-8") as f_txt:
        f_txt.write(relatorio_txt)

    with open(caminho_json, "w", encoding="utf-8") as f_json:
        json.dump(relatorio_json, f_json, indent=4, ensure_ascii=False)

    print(f"Relatórios salvos em:\n{caminho_txt}\n{caminho_json}")
    print(f"Pasta onde foram salvos os relatórios: {pasta_relatorios}")
    


    
# Bloco principal que executa tudo quando o script é rodado
if __name__ == "__main__":
    
    w = wmi.WMI()  # Instancia objeto WMI para consultas ao Windows

    # Obtém todas as informações necessárias
    print("Iniciando coleta de informações da CPU...")  
    cpu = get_cpu_info(w)
    print("Finalizado coleta de informações da CPU.\n")  

    print("Iniciando coleta de informações da RAM...")  
    ram = get_ram_info()
    print("Finalizado coleta de informações da RAM.\n")  

    print("Iniciando coleta de informações dos discos...")  
    disks = get_disks_info()
    print("Finalizado coleta de informações dos discos.\n")  

    print("Iniciando coleta de informações do sistema operacional...")  
    os_info = get_os_info()
    print("Finalizado coleta de informações do sistema operacional.\n")  

    # Realiza testes de desempenho
    print("Iniciando teste de CPU (soma de quadrados)...")  
    tempo_cpu = teste_cpu()
    print("Finalizado teste de CPU (soma de quadrados).\n")  

    print("Iniciando teste de CPU (fatorial)...")  
    tempo_cpu_fatorial = teste_cpu_fatorial()
    print("Finalizado teste de CPU (fatorial).\n")  

    tempo_ram = teste_ram_alocacao()  

    print("Iniciando testes de discos...")  
    tempos_discos = teste_todos_discos(disks)
    print("Finalizado testes de discos.\n")  

    # Outras informações do sistema
    print("Iniciando coleta de uptime da máquina...")  
    uptime = get_uptime(w)
    print("Finalizado coleta de uptime.\n")  

    print("Iniciando coleta da data da BIOS...")  
    bios_date = get_bios_date(w)
    print("Finalizado coleta da data da BIOS.\n")  

    print("Iniciando coleta da versão e edição do Windows...")  
    win_edition, win_version = get_windows_version_and_edition(w)
    print("Finalizado coleta da versão e edição do Windows.\n")  

    print("Iniciando identificação do tipo da máquina...")  
    machine_type = get_machine_type(w)
    print("Finalizado identificação do tipo da máquina.\n")  

    print("Iniciando coleta de informações da placa mãe...")  
    mb_manufacturer, mb_product = get_motherboard_info(w)
    print("Finalizado coleta de informações da placa mãe.\n")  

    print("Iniciando coleta de dispositivos USB conectados...")  
    dispositivos_usb = get_usb_devices(w)
    print("Finalizado coleta de dispositivos USB.\n")  

    print("Iniciando coleta de portas USB disponíveis...")  
    portas_usb = get_usb_ports(w)
    print("Finalizado coleta de portas USB.\n") 

    # Verifica requisitos mínimos e avançados
    erros = verificar_requisitos(cpu, ram, disks, os_info)
    erros.extend(verificar_requisitos_avancados(machine_type))

    # Calcula pontuações finais
    scores = calcular_pontuacoes(cpu, ram, disks, tempo_cpu, tempo_cpu_fatorial, tempos_discos, tempo_ram)

    # Exibe resumo no terminal
    print("==== RESUMO ====")
    print("Uptime da máquina:", uptime)
    print("Data da BIOS:", bios_date)
    print(f"Windows: {win_edition} - Versão {win_version}")
    print("Tipo da máquina:", machine_type)
    print(f"Placa Mãe: {mb_manufacturer} - {mb_product}")
    print("CPU:", cpu)
    print("RAM:", ram)
    print(f"Total: {ram['total']} GB | Usada: {ram['used']} GB | Disponível: {ram['available']} GB | Uso atual: {ram['percent']}%")
    print(f"Tempo alocação RAM:", tempo_ram)
    print("DISK:", disks)
    print("OS:", os_info)
    print("ERROS:", erros)
    print(f"TEMPO CPU (soma quadrados): {tempo_cpu}s")
    print(f"TEMPO CPU (fatorial): {tempo_cpu_fatorial}s")
    for dev, tempos in tempos_discos.items():
        print(f"DISCO {dev}: escrita {tempos['write']}s, leitura {tempos['read']}s")
    print("PONTUAÇÕES:", f"CPU: {scores[0]}/10 | RAM: {scores[1]}/10 | Disco: {scores[2]}/10")
    print("PONTUAÇÃO FINAL:", scores[3], "/10")



    # Gera o relatório completo em arquivo
    placa_mae = {
    "Fabricante": mb_manufacturer,
    "Modelo": mb_product
}

gerar_relatorio(cpu, ram, disks, os_info, placa_mae, uptime, portas_usb, dispositivos_usb,
                tempo_cpu=tempo_cpu, tempo_cpu_fatorial=tempo_cpu_fatorial, tempos_discos=tempos_discos,
                tempo_ram=tempo_ram, scores=scores, erros=erros,
                bios_date=bios_date, win_edition=win_edition, win_version=win_version, machine_type=machine_type)

    

