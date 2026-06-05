import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Pressable, Text } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { OptionChips } from '@/components/ui/OptionChips';

describe('components/ui', () => {
  it('AppButton dispara onPress quando habilitado', () => {
    const onPress = jest.fn();
    const tree = renderer.create(React.createElement(AppButton, { title: 'Salvar', onPress }));

    act(() => {
      tree.root.findByType(Pressable).props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType(Text).props.children).toBe('Salvar');
  });

  it('AppButton mantem disabled quando desabilitado', () => {
    const tree = renderer.create(React.createElement(AppButton, { title: 'Salvar', onPress: jest.fn(), disabled: true }));

    expect(tree.root.findByType(Pressable).props.disabled).toBe(true);
  });

  it('OptionChips chama onChange com a opcao selecionada', () => {
    const onChange = jest.fn();
    const tree = renderer.create(React.createElement(OptionChips, {
      label: 'Sexo',
      options: ['Macho', 'Femea'],
      value: 'Macho',
      onChange
    }));

    const chips = tree.root.findAllByType(Pressable);
    act(() => {
      chips[1].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('Femea');
  });

  it('OptionChips bloqueia onChange quando esta desabilitado', () => {
    const onChange = jest.fn();
    const tree = renderer.create(React.createElement(OptionChips, {
      label: 'Sexo',
      options: ['Macho', 'Femea'],
      value: 'Macho',
      onChange,
      disabled: true
    }));

    const chips = tree.root.findAllByType(Pressable);
    act(() => {
      chips[1].props.onPress();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

export {};
