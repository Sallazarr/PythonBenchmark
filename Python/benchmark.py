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
    for usb in w.Win32_USBControllerDevice():
        try:
            devices.append(usb.Dependent.Name)
        except:
            continue
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
def verificar_requisitos_avancados(win_edition, machine_type):
    erros = []
    if "Pro" not in win_edition:
        erros.append(f"Sistema operacional não é versão Pro: {win_edition}")
    if machine_type != "Desktop":
        erros.append(f"Recomendado usar máquina Desktop, detectado: {machine_type}")
    return erros

# Função que gera o relatório final em arquivo texto
def gerar_relatorio(cpu, ram, disks, os_info, erros, tempo_cpu, tempos_discos, scores,
                   uptime, bios_date, win_edition, win_version, machine_type, dispositivos_usb, portas_usb,
                   tempo_cpu_fatorial=None, mb_manufacturer=None, mb_product=None):
    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    filename = f"relatorio_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

    with open(filename, 'w', encoding='utf-8') as f:
        f.write("===== PAYER - RELATÓRIO DE BENCHMARK =====\n")
        f.write(f"Data: {data}\n")
        f.write("--------------------------------------------\n\n")

        f.write("[Configurações Mínimas Recomendadas]\n")
        f.write("CPU: Frequência >= 1.9 GHz\n")
        f.write("RAM: >= 4 GB\n")
        f.write("Sistema Operacional: Windows 7 ou superior\n\n")

        f.write("============================================\n\n")

        f.write("[CPU]\n")
        f.write(f"Nome: {cpu['name']}\n")
        f.write(f"Núcleos: {cpu['cores']} | Threads: {cpu['threads']}\n")
        f.write(f"Frequência Máxima: {cpu['freq']} MHz\n")
        f.write(f"Tempo de processamento teste soma quadrados: {tempo_cpu} segundos\n")
        if tempo_cpu_fatorial is not None:
            f.write(f"Tempo de processamento teste fatorial: {tempo_cpu_fatorial} segundos\n")
        f.write(f"Pontuação CPU: {scores[0]}/10\n\n")

        f.write("============================================\n\n")

        f.write("[RAM]\n")
        f.write(f"Total: {ram['total']} GB | Usada: {ram['used']} GB | Disponível: {ram['available']} GB | Uso atual: {ram['percent']}%\n")
        f.write(f"Pontuação RAM: {scores[1]}/10\n\n")

        f.write("============================================\n\n")

        f.write("[Discos]\n")
        for disk in disks:
            device = disk["device"]
            f.write(f"Disco: {device} ({disk['fstype']}) montado em {disk['mountpoint']}\n")
            f.write(f"Total: {disk['total']} GB | Livre: {disk['free']} GB | Uso: {disk['used_percent']}%\n")
            tempos = tempos_discos.get(device, {"write": -1, "read": -1})
            f.write(f"Tempo escrita: {tempos['write']}s | Tempo leitura: {tempos['read']}s\n\n")

        f.write("============================================\n\n")

        f.write("[Portas USB]\n")
        for port in portas_usb:
            f.write(f"- {port}\n")

        f.write("\n============================================\n\n")

        f.write("[Dispositivos USB Detectados]\n")
        dispositivos_contados = Counter(dispositivos_usb)
        for device, count in dispositivos_contados.most_common():
            if count > 1:
                f.write(f"- {device} (x{count})\n")
            else:
                f.write(f"- {device}\n")

        f.write("\n============================================\n\n")

        f.write("[Sistema e Máquina]\n")
        f.write(f"Sistema Operacional: {win_edition} ({os_info['architecture']}) - Versão {win_version}\n")
        f.write(f"Tipo da máquina: {machine_type}\n")
        f.write(f"Uptime da máquina: {uptime}\n")
        f.write(f"Data da BIOS: {bios_date}\n")
        f.write(f"Placa Mãe: {mb_manufacturer} - {mb_product}\n\n")

        f.write("--------------------------------------------\n\n")

        if erros:
            f.write("CONDIÇÃO: INAPTA\n")
            f.write("Problemas encontrados:\n")
            for erro in erros:
                f.write(f"- {erro}\n")
        else:
            f.write("CONDIÇÃO: APTA PARA O SISTEMA\n")

        f.write(f"Pontuação Geral: {scores[3]}/10\n")

    print(f"\nRelatório salvo como: {filename}")

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
    erros.extend(verificar_requisitos_avancados(win_edition, machine_type))

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
    gerar_relatorio(cpu, ram, disks, os_info, erros, tempo_cpu, tempos_discos, scores,
                    uptime, bios_date, win_edition, win_version, machine_type,
                    dispositivos_usb, portas_usb, tempo_cpu_fatorial, mb_manufacturer, mb_product)
