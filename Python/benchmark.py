import psutil
import platform
from datetime import datetime
import wmi
import time
import tempfile
import os

def bytes_to_gb(bytes_value):
    return round(bytes_value / (1024 ** 3), 2)

def get_cpu_info():
    w = wmi.WMI()
    for cpu in w.Win32_Processor():
        name = cpu.Name.strip()
        cores = cpu.NumberOfCores
        threads = cpu.NumberOfLogicalProcessors
        freq = cpu.MaxClockSpeed  # em MHz
        return {
            "name": name,
            "cores": cores,
            "threads": threads,
            "freq": freq
        }
    return {
        "name": platform.processor(),
        "cores": psutil.cpu_count(logical=False),
        "threads": psutil.cpu_count(logical=True),
        "freq": round(psutil.cpu_freq().max if psutil.cpu_freq() else 0, 2)
    }

def get_ram_info():
    mem = psutil.virtual_memory()
    return {
        "total": bytes_to_gb(mem.total),
        "used": bytes_to_gb(mem.used),
        "percent": mem.percent
    }

def get_disks_info():
    disks = []
    partitions = psutil.disk_partitions(all=False)
    for p in partitions:
        try:
            usage = psutil.disk_usage(p.mountpoint)
            disks.append({
                "device": p.device,
                "mountpoint": p.mountpoint,
                "fstype": p.fstype,
                "total": bytes_to_gb(usage.total),
                "free": bytes_to_gb(usage.free),
                "used_percent": usage.percent
            })
        except PermissionError:
            # Pode acontecer se não tiver permissão de acesso
            continue
    return disks


def get_os_info():
    return {
        "system": platform.system(),
        "version": platform.version(),
        "release": platform.release(),
        "architecture": platform.architecture()[0]
    }

def teste_cpu():
    start = time.time()
    total = sum(i*i for i in range(15_000_000))  # Carga leve, ajustável
    end = time.time()
    return round(end - start, 3)

def teste_disco():
    try:
        temp_path = os.path.join(tempfile.gettempdir(), "benchmark_test_file")
        data = os.urandom(500 * 1024 * 1024)  # 10 MB

        # Escrita
        start_write = time.time()
        with open(temp_path, 'wb') as f:
            f.write(data)
        end_write = time.time()

        # Leitura
        start_read = time.time()
        with open(temp_path, 'rb') as f:
            f.read()
        end_read = time.time()

        os.remove(temp_path)

        tempo_write = round(end_write - start_write, 3)
        tempo_read = round(end_read - start_read, 3)

        return tempo_write, tempo_read
    except Exception as e:
        return -1, -1

def calcular_pontuacoes(cpu, ram, disk, tempo_cpu, tempo_write, tempo_read):
    score_cpu = max(0, 10 - tempo_cpu * 2)
    score_ram = min(10, (ram["total"] / 8) * 10)
    score_disco = max(0, 10 - (tempo_write + tempo_read) * 2)

    media = round((score_cpu + score_ram + score_disco) / 3, 2)
    return score_cpu, score_ram, score_disco, media

def verificar_requisitos(cpu, ram, disks, os_info):
    erros = []

    if cpu["freq"] < 1800 or cpu["cores"] < 2:
      erros.append(f"CPU abaixo do mínimo: {cpu['freq']} MHz e {cpu['cores']} núcleos (mínimo 1900 MHz e 2 núcleos)")

    if ram["total"] < 3:
        erros.append(f"RAM insuficiente: {ram['total']} GB (mínimo 4 GB)")

    for disk in disks:
        if disk["free"] < 1:
            erros.append(f"Pouco espaço livre em disco {disk['device']} ({disk['mountpoint']}): {disk['free']} GB (mínimo 1 GB)")


    return erros



def gerar_relatorio(cpu, ram, disk, os_info, erros, tempo_cpu, tempo_write, tempo_read, scores):
    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    filename = f"relatorio_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

    with open(filename, 'w', encoding='utf-8') as f:
        f.write("===== PAYER - RELATÓRIO DE BENCHMARK =====\n")
        f.write(f"Data: {data}\n\n")

        f.write("[Configurações Mínimas Recomendadas]\n")
        f.write("CPU: Frequência >= 1.9 GHz\n")
        f.write("RAM: >= 4 GB\n")
        f.write("Sistema Operacional: Windows 7 ou superior\n\n")

        f.write("[CPU]\n")
        f.write(f"Nome: {cpu['name']}\n")
        f.write(f"Núcleos: {cpu['cores']} | Threads: {cpu['threads']}\n")
        f.write(f"Frequência Máxima: {cpu['freq']} MHz\n")
        f.write(f"Tempo de processamento teste: {tempo_cpu} segundos\n")
        f.write(f"Pontuação CPU: {scores[0]}/10\n\n")

        f.write("[RAM]\n")
        f.write(f"Total: {ram['total']} GB | Uso atual: {ram['percent']}%\n")
        f.write(f"Pontuação RAM: {scores[1]}/10\n\n")

        disks = get_disks_info()
        for disk in disks:
            f.write(f"Disco: {disk['device']} ({disk['fstype']}) montado em {disk['mountpoint']}\n")
            f.write(f"Total: {disk['total']} GB | Livre: {disk['free']} GB | Uso: {disk['used_percent']}%\n\n")

        f.write("[Disco]\n")
        f.write(f"Total: {disk['total']} GB | Livre: {disk['free']} GB | Uso: {disk['used_percent']}%\n")
        f.write(f"Tempo escrita: {tempo_write}s | Tempo leitura: {tempo_read}s\n")
        f.write(f"Pontuação Disco: {scores[2]}/10\n\n")

        f.write("[Sistema Operacional]\n")
        f.write(f"{os_info['system']} {os_info['release']} ({os_info['architecture']})\n\n")

        if erros:
            f.write("CONDIÇÃO: INAPTA\n")
            f.write("Problemas encontrados:\n")
            for erro in erros:
                f.write(f"- {erro}\n")
        else:
            f.write("CONDIÇÃO: APTA PARA O SISTEMA\n")

        f.write(f"\nPontuação Geral: {scores[3]}/10\n")

    print(f"\nRelatório salvo como: {filename}")

# --- Execução principal ---
if __name__ == "__main__":
    cpu = get_cpu_info()
    ram = get_ram_info()
    disks = get_disks_info()
    os_info = get_os_info()

    tempo_cpu = teste_cpu()
    tempo_write, tempo_read = teste_disco()

    erros = verificar_requisitos(cpu, ram, disks, os_info)
    scores = calcular_pontuacoes(cpu, ram, disks, tempo_cpu, tempo_write, tempo_read)

    print("==== RESUMO ====")
    print("CPU:", cpu)
    print("RAM:", ram)
    print("DISK:", disks)
    print("OS:", os_info)
    print("ERROS:", erros)
    print(f"TEMPO CPU: {tempo_cpu}s | DISCO: escrita {tempo_write}s, leitura {tempo_read}s")
    print("PONTUAÇÕES:", f"CPU: {scores[0]}/10 | RAM: {scores[1]}/10 | Disco: {scores[2]}/10")
    print("PONTUAÇÃO FINAL:", scores[3], "/10")

    gerar_relatorio(cpu, ram, disks, os_info, erros, tempo_cpu, tempo_write, tempo_read, scores)
