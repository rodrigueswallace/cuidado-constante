import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, SafeAreaView, Text, TextInput, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';

const mockGetBrandLogoUrl = jest.fn();

jest.mock('@/services/branding', () => ({
  getBrandLogoUrl: mockGetBrandLogoUrl
}));

describe('more components/ui', () => {
  beforeEach(() => {
    mockGetBrandLogoUrl.mockReset();
  });

  it('AppCard renderiza conteudo interno', () => {
    const tree = renderer.create(React.createElement(AppCard, null, React.createElement(Text, null, 'Conteudo')));

    expect(tree.root.findByType(Text).props.children).toBe('Conteudo');
  });

  it('AppInput renderiza label e repassa props para TextInput', () => {
    const onChangeText = jest.fn();
    const tree = renderer.create(React.createElement(AppInput, {
      label: 'Nome',
      value: 'Thor',
      onChangeText,
      placeholder: 'Digite'
    }));

    expect(tree.root.findByType(Text).props.children).toBe('Nome');
    expect(tree.root.findByType(TextInput).props.value).toBe('Thor');
    expect(tree.root.findByType(TextInput).props.placeholder).toBe('Digite');
  });

  it('AppScreen renderiza SafeAreaView e aplica padding por padrao', () => {
    const tree = renderer.create(React.createElement(AppScreen, { children: React.createElement(Text, null, 'Tela') }));

    expect(tree.root.findByType(SafeAreaView)).toBeTruthy();
    expect(tree.root.findByType(Text).props.children).toBe('Tela');
  });

  it('AppScreen permite remover padding', () => {
    const tree = renderer.create(React.createElement(AppScreen, { padded: false, children: React.createElement(Text, null, 'Tela') }));

    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0);
  });

  it('AppLogo usa logo remota quando disponivel', () => {
    mockGetBrandLogoUrl.mockReturnValue('https://cdn.test/logo.png');
    const { AppLogo } = require('@/components/ui/AppLogo');

    const tree = renderer.create(React.createElement(AppLogo));

    expect(tree.root.findByType(Image).props.source).toEqual({ uri: 'https://cdn.test/logo.png' });
  });

  it('AppLogo volta para badge quando imagem remota falha', () => {
    mockGetBrandLogoUrl.mockReturnValue('https://cdn.test/logo.png');
    const { AppLogo } = require('@/components/ui/AppLogo');
    const tree = renderer.create(React.createElement(AppLogo));

    act(() => {
      tree.root.findByType(Image).props.onError();
    });

    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findAllByType(Text).some((node) => node.props.children === 'CC')).toBe(true);
  });
});

export {};
