"""Start Websocket server as main application."""
from configparser import ConfigParser
from logging.config import fileConfig
from os import path
from signal import signal
from signal import SIGTERM
import logging
import os
import sys

from autobahn.asyncio.websocket import WebSocketServerFactory
from adhocracy.websockets.server import ClientCommunicator
import asyncio


logger = logging.getLogger(__name__)


def main(args=[]) -> int:
    """Start WebSockets server.

    :param args: the command-line arguments -- we expect just one: the
                 config file to use
    :return: 0 on success
    """
    if not args:
        args = sys.argv[1:]
    if len(args) != 1:
        raise ValueError('Expected 1 command-line argument (the config file), '
                         'but got {}'.format(len(args)))
    config_file = args[0]
    fileConfig(config_file)
    config = _read_config(config_file)
    port = _read_config_variable_or_die(config, 'port', is_int=True)
    pid_file = _read_config_variable_or_die(config, 'pid_file')
    _check_and_write_pid_file(pid_file)
    _register_sigterm_handler(pid_file)
    _start_loop(config, port, pid_file)


def _read_config_variable_or_die(config: ConfigParser, name: str,
                                 is_int: bool=False):
    """Read a variable from the [websockets] section of `config`.

    :raise RuntimeError: if the variable does not exist or doesn't have the
                         expected type
    """
    result = config.get('websockets', name, fallback=None)
    if not result:
        raise RuntimeError('Config entry "{}" in [websockets] section '
                           'missing or empty'.format(name))
    if is_int:
        try:
            result = int(result)
        except ValueError:
            raise RuntimeError('Config entry "{}" in [websockets] section is '
                               'not an integer: {}'.format(name, result))
    return result


def _check_and_write_pid_file(pid_file: str):
    if os.path.isfile(pid_file):
        raise RuntimeError('Pidfile already exists: ' + pid_file)
    pid = os.getpid()
    pidfile = open(pid_file, 'w')
    pidfile.write('%s\n' % pid)
    pidfile.close


def _register_sigterm_handler(pid_file: str):
    """Register handler for the SIGTERM signal ('kill' command).

    The new handler will remove the PID file and exit.
    """
    def sigterm_handler(sig, frame):
        logger.info('Kill signal (SIGTERM) received, exiting')
        _remove_pid_file(pid_file)
        sys.exit()

    signal(SIGTERM, sigterm_handler)


def _start_loop(config: ConfigParser, port: int, pid_file: str):
    try:
        factory = WebSocketServerFactory('ws://localhost:{}'.format(port))
        factory.protocol = ClientCommunicator
        loop = asyncio.get_event_loop()
        coro = loop.create_server(factory, port=port)
        logger.debug('Started WebSocket server listening on port %i', port)
        server = loop.run_until_complete(coro)
        _run_loop_until_interrupted(loop, server)
    finally:
        logger.info('Stopped WebSocket server')
        _remove_pid_file(pid_file)


def _remove_pid_file(pid_file: str):
    if os.path.isfile(pid_file):
        os.unlink(pid_file)


def _run_loop_until_interrupted(loop, server):
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        logger.debug('Exiting due to keyboard interrupt (Ctrl-C)')
    finally:
        server.close()
        loop.close()
        return 0


def _read_config(config_file: str) -> ConfigParser:
    config = ConfigParser()
    config.read(config_file)
    _inject_here_variable(config, config_file)
    return config


def _inject_here_variable(config: ConfigParser, config_file: str):
    """Inject the %(here) variable into a config."""
    dir_containing_config_file = path.dirname(config_file)
    config['app:main']['here'] = dir_containing_config_file
